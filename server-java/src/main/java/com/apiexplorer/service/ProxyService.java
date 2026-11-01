package com.apiexplorer.service;

import com.apiexplorer.model.ProxyRequest;
import com.apiexplorer.model.ProxyResponse;
import com.apiexplorer.model.RequestLog;
import com.apiexplorer.repository.RequestLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProxyService {
    private static final Logger log = LoggerFactory.getLogger(ProxyService.class);

    private static final String SHIPIQ_BASE = "https://shipiq-backend-service.onrender.com";
    private static final String SHIPIQ_HOST = URI.create(SHIPIQ_BASE).getHost(); // "shipiq-backend-service.onrender.com"
    private static final int TIMEOUT_MS = 8000;
    // Cap the response body we'll read and store — protects memory and DB column size.
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB

    // Headers that must never be forwarded — they are hop-by-hop or sensitive.
    private static final Set<String> BLOCKED_REQUEST_HEADERS = Set.of(
        "host", "content-length", "transfer-encoding", "connection",
        "te", "trailer", "upgrade"
    );

    // Headers that contain credentials and should be redacted before logging.
    private static final Set<String> SENSITIVE_HEADERS = Set.of(
        "authorization", "cookie", "set-cookie", "x-api-key",
        "x-auth-token", "proxy-authorization"
    );

    private final RequestLogRepository repo;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ProxyService(RequestLogRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(TIMEOUT_MS))
            .build();
    }

    /**
     * Validates the caller-supplied path against SSRF:
     * <ul>
     *   <li>Must start with "/" (prevents "@host" and "//host" attacks).</li>
     *   <li>Must not contain ".." (path traversal), "?" or "#" (query/fragment
     *       injection — those are handled via the dedicated queryParams field),
     *       or backslashes.</li>
     *   <li>After concatenation the resolved host must exactly equal SHIPIQ_HOST.</li>
     * </ul>
     */
    private void validatePath(String p) {
        if (p == null || p.isBlank()) {
            throw new IllegalArgumentException("Missing required field: path");
        }
        if (!p.startsWith("/")) {
            throw new IllegalArgumentException("path must start with '/'");
        }
        if (p.contains("..") || p.contains("//") || p.contains("\\")
                || p.contains("?") || p.contains("#")) {
            throw new IllegalArgumentException(
                "path contains disallowed characters ('..', '//', '\\', '?', '#')");
        }
        // Post-construction host check — catches any edge case the prefix rules miss.
        URI built;
        try {
            built = URI.create(SHIPIQ_BASE + p);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("path produces an invalid URI: " + e.getMessage());
        }
        if (!SHIPIQ_HOST.equalsIgnoreCase(built.getHost())) {
            throw new IllegalArgumentException(
                "path resolves to a host other than the allowed target");
        }
    }

    /**
     * Strips hop-by-hop / dangerous headers so we never forward them to ShipIQ
     * and never accidentally set restricted headers on the outgoing Java HttpRequest.
     */
    private Map<String, String> sanitiseRequestHeaders(Map<String, String> headers) {
        return headers.entrySet().stream()
            .filter(e -> !BLOCKED_REQUEST_HEADERS.contains(e.getKey().toLowerCase()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /**
     * Returns a copy of the header map with sensitive values replaced by "[REDACTED]"
     * so credentials are never written to the DB or returned to callers.
     */
    private Map<String, String> redactSensitiveHeaders(Map<String, String> headers) {
        return headers.entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> SENSITIVE_HEADERS.contains(e.getKey().toLowerCase()) ? "[REDACTED]" : e.getValue()
            ));
    }

    public ProxyResponse proxy(ProxyRequest request) {
        // --- Path validation (SSRF guard) ---
        validatePath(request.getPath());

        String method = request.getMethod() != null ? request.getMethod().toUpperCase() : "GET";
        String reqPath = request.getPath();
        Map<String, Object> queryParams = request.getQueryParams() != null ? request.getQueryParams() : Map.of();
        Map<String, String> rawHeaders = request.getHeaders() != null ? request.getHeaders() : Map.of();
        Map<String, String> safeHeaders = sanitiseRequestHeaders(rawHeaders);
        Object reqBody = request.getBody();

        // Build URL (queryParams are already URL-encoded individually)
        String fullUrl = SHIPIQ_BASE + reqPath;
        String queryString = queryParams.entrySet().stream()
            .filter(e -> e.getValue() != null && !e.getValue().toString().isEmpty())
            .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                    + URLEncoder.encode(e.getValue().toString(), StandardCharsets.UTF_8))
            .collect(Collectors.joining("&"));
        if (!queryString.isEmpty()) fullUrl += "?" + queryString;

        // Build HttpRequest — wrap in try so IllegalArgumentException (bad header name, etc.)
        // is caught and classified rather than leaking as a raw 500.
        HttpRequest httpRequest;
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .timeout(Duration.ofMillis(TIMEOUT_MS))
                .header("Content-Type", "application/json");
            safeHeaders.forEach(builder::header);

            String bodyJson = null;
            if (List.of("POST", "PUT").contains(method) && reqBody != null) {
                try {
                    bodyJson = objectMapper.writeValueAsString(reqBody);
                } catch (Exception e) {
                    bodyJson = "{}";
                }
            }

            HttpRequest.BodyPublisher bodyPublisher = bodyJson != null
                ? HttpRequest.BodyPublishers.ofString(bodyJson)
                : HttpRequest.BodyPublishers.noBody();
            builder.method(method, bodyPublisher);
            httpRequest = builder.build();
        } catch (IllegalArgumentException e) {
            // Restricted header name, malformed URI, etc.
            throw new IllegalArgumentException("Could not build outgoing request: " + e.getMessage());
        }

        long startTime = System.currentTimeMillis();
        Integer statusCode = null;
        String rawResponse = null;
        boolean isSuccess = false;
        String errorType = null;
        String errorMessage = null;
        Object parsedData = null;

        try {
            // ofByteArray() + manual truncation prevents unbounded memory growth.
            HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
            statusCode = response.statusCode();
            byte[] body = response.body();
            if (body.length > MAX_RESPONSE_BYTES) {
                rawResponse = new String(body, 0, MAX_RESPONSE_BYTES, StandardCharsets.UTF_8)
                    + "\n[... truncated at " + (MAX_RESPONSE_BYTES / 1024) + " KB]";
            } else {
                rawResponse = new String(body, StandardCharsets.UTF_8);
            }

            try {
                parsedData = objectMapper.readValue(rawResponse, Object.class);
            } catch (Exception parseEx) {
                errorType = "MALFORMED_JSON";
                errorMessage = "Server returned invalid JSON: " + parseEx.getMessage();
                parsedData = null;
            }

            if (statusCode >= 200 && statusCode < 300) {
                if (errorType == null) {
                    boolean isEmpty = parsedData instanceof List && ((List<?>) parsedData).isEmpty();
                    boolean isDataEmpty = false;
                    if (parsedData instanceof Map) {
                        Object dataField = ((Map<?, ?>) parsedData).get("data");
                        isDataEmpty = dataField instanceof List && ((List<?>) dataField).isEmpty();
                    }
                    if (isEmpty || isDataEmpty) {
                        isSuccess = true;
                        errorType = "EMPTY_STATE";
                        errorMessage = "Request succeeded but returned no data";
                    } else {
                        isSuccess = true;
                    }
                }
            } else {
                errorType = "HTTP_ERROR";
                errorMessage = "HTTP " + statusCode + ": " + getHttpErrorMessage(statusCode);
                if (parsedData instanceof Map) {
                    Map<?, ?> dataMap = (Map<?, ?>) parsedData;
                    if (dataMap.get("error") != null)   errorMessage += " \u2014 " + dataMap.get("error");
                    else if (dataMap.get("message") != null) errorMessage += " \u2014 " + dataMap.get("message");
                }
            }
        } catch (HttpTimeoutException e) {
            errorType = "TIMEOUT";
            errorMessage = "Request timed out after " + (TIMEOUT_MS / 1000) + "s (API may be hanging)";
        } catch (Exception e) {
            errorType = "NETWORK_ERROR";
            errorMessage = "Network error: " + e.getMessage();
        }

        long responseTime = System.currentTimeMillis() - startTime;

        // --- Log to DB (use redacted headers so credentials are never stored) ---
        Long logId = null;
        try {
            Map<String, String> headersToLog = redactSensitiveHeaders(safeHeaders);
            String errorBodyFallback = null;
            if (rawResponse == null && errorMessage != null) {
                // Use Jackson — never string-concatenate JSON.
                errorBodyFallback = objectMapper.writeValueAsString(Map.of("error", errorMessage));
            }
            RequestLog logEntry = new RequestLog();
            logEntry.setMethod(method);
            logEntry.setUrl(fullUrl);
            logEntry.setEndpoint(reqPath);
            logEntry.setRequestHeaders(objectMapper.writeValueAsString(headersToLog));
            logEntry.setRequestBody(reqBody != null ? objectMapper.writeValueAsString(reqBody) : null);
            logEntry.setQueryParams(!queryParams.isEmpty() ? objectMapper.writeValueAsString(queryParams) : null);
            logEntry.setStatusCode(statusCode);
            logEntry.setResponseBody(rawResponse != null ? rawResponse : errorBodyFallback);
            logEntry.setResponseTime((int) responseTime);
            logEntry.setIsSuccess(isSuccess ? 1 : 0);
            logEntry.setErrorType(errorType);
            logEntry.setErrorMessage(errorMessage);
            logId = repo.insert(logEntry);
        } catch (Exception dbEx) {
            log.error("Failed to log request to database", dbEx);
        }

        ProxyResponse resp = new ProxyResponse();
        resp.setStatus(statusCode);
        resp.setData(parsedData);
        resp.setResponseTime(responseTime);
        resp.setError(errorMessage);
        resp.setErrorType(errorType);
        if ("MALFORMED_JSON".equals(errorType)) resp.setRawResponse(rawResponse);
        resp.setLogId(logId);
        resp.setSuccess(isSuccess);
        return resp;
    }

    private String getHttpErrorMessage(int statusCode) {
        return switch (statusCode) {
            case 400 -> "Bad Request \u2014 the server could not understand the request";
            case 401 -> "Unauthorized \u2014 authentication is required";
            case 403 -> "Forbidden \u2014 you do not have permission to access this resource";
            case 404 -> "Not Found \u2014 the requested resource does not exist";
            case 429 -> "Too Many Requests \u2014 rate limit exceeded";
            case 500 -> "Internal Server Error \u2014 the server encountered an unexpected condition";
            case 502 -> "Bad Gateway \u2014 upstream server returned an invalid response";
            case 503 -> "Service Unavailable \u2014 the server is temporarily overloaded";
            case 504 -> "Gateway Timeout \u2014 upstream server did not respond in time";
            default  -> "Unexpected error (status " + statusCode + ")";
        };
    }
}
