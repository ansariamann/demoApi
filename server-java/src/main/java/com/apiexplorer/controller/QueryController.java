package com.apiexplorer.controller;

import com.apiexplorer.service.QueryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/query")
public class QueryController {
    private static final Logger log = LoggerFactory.getLogger(QueryController.class);
    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping
    public ResponseEntity<?> query(@RequestBody Map<String, String> body) {
        String sql = body.get("sql");
        if (sql == null || sql.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Missing required field: sql",
                "hint", "Send a JSON body with { \"sql\": \"SELECT * FROM request_logs\" }"
            ));
        }
        try {
            return ResponseEntity.ok(queryService.executeQuery(sql));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                "error", e.getMessage(),
                "hint", "Only read-only SELECT queries are allowed"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of(
                "error", e.getMessage(),
                "hint", "Write queries like: SELECT * FROM request_logs WHERE status_code > 399"
            ));
        } catch (Exception e) {
            // Log the real SQL error server-side; return a generic message to the caller.
            log.warn("Query execution error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "SQL Error: check your query syntax",
                "hint", "Table name is \"request_logs\". Only SELECT is allowed."
            ));
        }
    }

    @GetMapping("/presets")
    public ResponseEntity<?> getPresets() {
        return ResponseEntity.ok(queryService.getPresets());
    }

    @GetMapping("/schema")
    public ResponseEntity<?> getSchema() {
        try {
            return ResponseEntity.ok(queryService.getSchema());
        } catch (Exception e) {
            log.error("Schema fetch error", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch schema"));
        }
    }
}

