package com.apiexplorer.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        return Map.of(
            "status", "ok",
            "timestamp", Instant.now().toString(),
            "uptime", uptimeMs / 1000.0
        );
    }
}
