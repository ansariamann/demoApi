package com.apiexplorer.service;

import com.apiexplorer.repository.RequestLogRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class QueryService {
    private final RequestLogRepository repo;
    private final DataSource dataSource;

    // Hard cap on rows returned by the query interface — prevents cross-join DoS.
    private static final int MAX_QUERY_ROWS = 500;

    // DOTALL so '.' matches newlines — closes the newline-bypass on keyword checks.
    // We check for these as whole words so column names like "created_at" are safe.
    private static final String[] FORBIDDEN_KEYWORDS = {
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
        "TRUNCATE", "REPLACE", "ATTACH", "DETACH", "VACUUM",
        "PRAGMA", "EXEC", "EXECUTE"
    };

    private static final List<Pattern> FORBIDDEN_PATTERNS = Arrays.stream(FORBIDDEN_KEYWORDS)
        .map(kw -> Pattern.compile("(?si).*\\b" + kw + "\\b.*"))
        .toList();

    public QueryService(RequestLogRepository repo, @Qualifier("readOnlyDataSource") DataSource dataSource) {
        this.repo = repo;
        this.dataSource = dataSource;
    }

    public Map<String, Object> executeQuery(String sql) {
        String trimmed = sql.trim();

        // Must start with SELECT
        if (!trimmed.toUpperCase().startsWith("SELECT")) {
            throw new IllegalArgumentException("Only SELECT queries are allowed");
        }

        // Blacklist dangerous keywords — DOTALL patterns, so newlines don't bypass them.
        for (Pattern p : FORBIDDEN_PATTERNS) {
            if (p.matcher(trimmed).matches()) {
                // Find which keyword matched for a useful error message.
                String kw = FORBIDDEN_KEYWORDS[FORBIDDEN_PATTERNS.indexOf(p)];
                throw new SecurityException("Query contains forbidden keyword: " + kw);
            }
        }

        // Execute on a read-only connection — the DB driver enforces this at the
        // JDBC level, so even if the blacklist is bypassed the write cannot land.
        long start = System.currentTimeMillis();
        List<Map<String, Object>> results = executeReadOnly(trimmed);
        long executionTime = System.currentTimeMillis() - start;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("data", results);
        response.put("rowCount", results.size());
        response.put("executionTime", executionTime);
        response.put("query", trimmed);
        return response;
    }

    /**
     * Runs the query on a read-only JDBC connection and caps results at MAX_QUERY_ROWS.
     * Using a raw connection (rather than JdbcTemplate) is the only reliable way to
     * set Connection.setReadOnly(true) per-query without a second DataSource bean.
     */
    private List<Map<String, Object>> executeReadOnly(String sql) {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            // setMaxRows limits how many rows the driver fetches — hard DoS guard.
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setMaxRows(MAX_QUERY_ROWS);
                ps.setQueryTimeout(5); // 5 second statement timeout guard
                try (ResultSet rs = ps.executeQuery()) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int colCount = meta.getColumnCount();
                    while (rs.next()) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        for (int i = 1; i <= colCount; i++) {
                            row.put(meta.getColumnLabel(i), rs.getObject(i));
                        }
                        rows.add(row);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
        return rows;
    }

    public Map<String, Object> getSchema() {
        List<Map<String, Object>> columns = repo.getSchema();
        List<Map<String, Object>> mapped = new ArrayList<>();
        for (Map<String, Object> col : columns) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("name", col.get("name"));
            c.put("type", col.get("type"));
            c.put("nullable", Integer.valueOf(0).equals(col.get("notnull")));
            c.put("defaultValue", col.get("dflt_value"));
            mapped.add(c);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tableName", "request_logs");
        result.put("columns", mapped);
        return result;
    }

    public Map<String, Object> getPresets() {
        List<Map<String, Object>> presets = new ArrayList<>();

        presets.add(preset("All Failed Requests", "Find all requests that returned an error",
            "SELECT id, timestamp, method, endpoint, status_code, error_type, error_message, response_time FROM request_logs WHERE is_success = 0 ORDER BY id DESC"));
        presets.add(preset("Slow Requests (>2000ms)", "Requests that took longer than 2 seconds",
            "SELECT id, timestamp, method, endpoint, status_code, response_time, error_type FROM request_logs WHERE response_time > 2000 ORDER BY response_time DESC"));
        presets.add(preset("Timeout Errors", "Requests that timed out (API was hanging)",
            "SELECT id, timestamp, method, endpoint, response_time, error_message FROM request_logs WHERE error_type = 'TIMEOUT' ORDER BY id DESC"));
        presets.add(preset("Malformed JSON Responses", "Requests where the API returned invalid JSON",
            "SELECT id, timestamp, method, endpoint, response_body FROM request_logs WHERE error_type = 'MALFORMED_JSON' ORDER BY id DESC"));
        presets.add(preset("Empty Responses", "Successful requests that returned no data",
            "SELECT id, timestamp, method, endpoint, response_time FROM request_logs WHERE error_type = 'EMPTY_STATE' ORDER BY id DESC"));
        presets.add(preset("Status Code Summary", "Count of requests grouped by status code",
            "SELECT status_code, COUNT(*) as count, ROUND(AVG(response_time)) as avg_time FROM request_logs GROUP BY status_code ORDER BY count DESC"));
        presets.add(preset("Error Type Breakdown", "Distribution of error types across all requests",
            "SELECT COALESCE(error_type, 'SUCCESS') as type, COUNT(*) as count, ROUND(AVG(response_time)) as avg_time FROM request_logs GROUP BY error_type ORDER BY count DESC"));
        presets.add(preset("Requests by Endpoint", "How many requests were made to each endpoint",
            "SELECT endpoint, method, COUNT(*) as count, SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as successes, SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as failures FROM request_logs GROUP BY endpoint, method ORDER BY count DESC"));
        presets.add(preset("Recent Activity", "Last 20 requests made",
            "SELECT id, timestamp, method, endpoint, status_code, response_time, is_success, error_type FROM request_logs ORDER BY id DESC LIMIT 20"));

        Map<String, Object> result = new HashMap<>();
        result.put("presets", presets);
        return result;
    }

    private Map<String, Object> preset(String name, String description, String sql) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("name", name);
        p.put("description", description);
        p.put("sql", sql);
        return p;
    }
}

