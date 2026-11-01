package com.apiexplorer.controller;

import com.apiexplorer.model.ProxyRequest;
import com.apiexplorer.model.ProxyResponse;
import com.apiexplorer.service.ProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {
    private final ProxyService proxyService;

    public ProxyController(ProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @PostMapping
    public ResponseEntity<?> proxy(@RequestBody ProxyRequest request) {
        // Method validation (path validation + SSRF check is done inside ProxyService.validatePath)
        String method = request.getMethod() != null ? request.getMethod().toUpperCase() : "GET";
        if (!List.of("GET", "POST", "PUT", "DELETE").contains(method)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid HTTP method: " + method + ". Must be one of: GET, POST, PUT, DELETE",
                "errorType", "VALIDATION_ERROR"
            ));
        }
        try {
            ProxyResponse response = proxyService.proxy(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            // Path validation failures (SSRF guard, missing path, bad characters)
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage(),
                "errorType", "VALIDATION_ERROR"
            ));
        }
    }
}
