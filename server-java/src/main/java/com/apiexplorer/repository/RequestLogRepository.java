package com.apiexplorer.repository;

import com.apiexplorer.model.RequestLog;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class RequestLogRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    public RequestLogRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbc = jdbc;
        this.namedJdbc = namedJdbc;
    }

    private final RowMapper<RequestLog> rowMapper = (rs, rowNum) -> {
        RequestLog log = new RequestLog();
        log.setId(rs.getLong("id"));
        log.setTimestamp(rs.getString("timestamp"));
        log.setMethod(rs.getString("method"));
        log.setUrl(rs.getString("url"));
        log.setEndpoint(rs.getString("endpoint"));
        log.setRequestHeaders(rs.getString("request_headers"));
        log.setRequestBody(rs.getString("request_body"));
        log.setQueryParams(rs.getString("query_params"));
        log.setStatusCode(rs.getObject("status_code") != null ? rs.getInt("status_code") : null);
        log.setResponseBody(rs.getString("response_body"));
        log.setResponseTime(rs.getObject("response_time") != null ? rs.getInt("response_time") : null);
        log.setIsSuccess(rs.getInt("is_success"));
        log.setErrorType(rs.getString("error_type"));
        log.setErrorMessage(rs.getString("error_message"));
        return log;
    };

    public long insert(RequestLog log) {
        String sql = """
            INSERT INTO request_logs
              (method, url, endpoint, request_headers, request_body, query_params,
               status_code, response_body, response_time, is_success, error_type, error_message)
            VALUES
              (:method, :url, :endpoint, :requestHeaders, :requestBody, :queryParams,
               :statusCode, :responseBody, :responseTime, :isSuccess, :errorType, :errorMessage)
            """;
        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("method", log.getMethod())
            .addValue("url", log.getUrl())
            .addValue("endpoint", log.getEndpoint())
            .addValue("requestHeaders", log.getRequestHeaders())
            .addValue("requestBody", log.getRequestBody())
            .addValue("queryParams", log.getQueryParams())
            .addValue("statusCode", log.getStatusCode())
            .addValue("responseBody", log.getResponseBody())
            .addValue("responseTime", log.getResponseTime())
            .addValue("isSuccess", log.getIsSuccess())
            .addValue("errorType", log.getErrorType())
            .addValue("errorMessage", log.getErrorMessage());
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update(sql, params, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public List<RequestLog> findFiltered(String status, String method, String errorType, int limit) {
        StringBuilder sql = new StringBuilder("SELECT * FROM request_logs WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (status != null) {
            if ("success".equals(status)) { sql.append(" AND is_success = 1"); }
            else if ("failure".equals(status)) { sql.append(" AND is_success = 0"); }
        }
        if (method != null) { sql.append(" AND method = ?"); args.add(method); }
        if (errorType != null) { sql.append(" AND error_type = ?"); args.add(errorType); }
        sql.append(" ORDER BY id DESC LIMIT ?");
        args.add(limit);
        return jdbc.query(sql.toString(), rowMapper, args.toArray());
    }

    public RequestLog findById(long id) {
        List<RequestLog> results = jdbc.query("SELECT * FROM request_logs WHERE id = ?", rowMapper, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public Map<String, Object> getStats() {
        return jdbc.queryForMap("""
            SELECT
              COUNT(*) as total,
              SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as successes,
              SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as failures,
              ROUND(AVG(response_time)) as avg_response_time,
              MAX(response_time) as max_response_time,
              MIN(response_time) as min_response_time
            FROM request_logs
            """);
    }

    public List<Map<String, Object>> getErrorBreakdown() {
        return jdbc.queryForList("""
            SELECT error_type, COUNT(*) as count
            FROM request_logs
            WHERE error_type IS NOT NULL
            GROUP BY error_type
            ORDER BY count DESC
            """);
    }

    public List<Map<String, Object>> getMethodBreakdown() {
        return jdbc.queryForList("""
            SELECT method, COUNT(*) as count
            FROM request_logs
            GROUP BY method
            ORDER BY count DESC
            """);
    }

    public List<Map<String, Object>> executeRaw(String sql) {
        return jdbc.queryForList(sql);
    }

    public List<Map<String, Object>> getSchema() {
        return jdbc.queryForList("PRAGMA table_info('request_logs')");
    }
}
