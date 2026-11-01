package com.apiexplorer.controller;

import com.apiexplorer.model.RequestLog;
import com.apiexplorer.service.HistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/history")
public class HistoryController {
    private static final Logger log = LoggerFactory.getLogger(HistoryController.class);
    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping
    public ResponseEntity<?> getHistory(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String error_type,
            @RequestParam(defaultValue = "100") int limit) {
        try {
            return ResponseEntity.ok(historyService.getFiltered(status, method, error_type, limit));
        } catch (Exception e) {
            log.error("History fetch error", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch history"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        try {
            return ResponseEntity.ok(historyService.getStats());
        } catch (Exception e) {
            log.error("Stats error", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to compute stats"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        long parsedId;
        try {
            parsedId = Long.parseLong(id);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ID \u2014 must be a number"));
        }
        try {
            RequestLog logEntry = historyService.getById(parsedId);
            if (logEntry == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Log entry #" + parsedId + " not found"));
            }
            return ResponseEntity.ok(Map.of("data", logEntry));
        } catch (Exception e) {
            log.error("History detail error for id={}", parsedId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch log entry"));
        }
    }
}

