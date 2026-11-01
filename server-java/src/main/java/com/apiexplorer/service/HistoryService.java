package com.apiexplorer.service;

import com.apiexplorer.model.RequestLog;
import com.apiexplorer.repository.RequestLogRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HistoryService {
    private final RequestLogRepository repo;

    public HistoryService(RequestLogRepository repo) {
        this.repo = repo;
    }

    public Map<String, Object> getFiltered(String status, String method, String errorType, int limit) {
        int safeLimit = Math.min(Math.max(1, limit), 500);
        String upperMethod = method != null ? method.toUpperCase() : null;
        List<RequestLog> logs = repo.findFiltered(status, upperMethod, errorType, safeLimit);
        Map<String, Object> result = new HashMap<>();
        result.put("data", logs);
        result.put("count", logs.size());
        Map<String, Object> filters = new HashMap<>();
        filters.put("status", status);
        filters.put("method", method);
        filters.put("error_type", errorType);
        filters.put("limit", safeLimit);
        result.put("filters", filters);
        return result;
    }

    public Map<String, Object> getStats() {
        Map<String, Object> result = new HashMap<>();
        result.put("stats", repo.getStats());
        result.put("errorBreakdown", repo.getErrorBreakdown());
        result.put("methodBreakdown", repo.getMethodBreakdown());
        return result;
    }

    public RequestLog getById(long id) {
        return repo.findById(id);
    }
}
