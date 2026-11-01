package com.apiexplorer.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProxyResponse {
    private Integer status;
    private Object data;
    private long responseTime;
    private String error;
    private String errorType;
    private String rawResponse;  // only for MALFORMED_JSON
    private Long logId;
    private boolean isSuccess;

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }

    public long getResponseTime() { return responseTime; }
    public void setResponseTime(long responseTime) { this.responseTime = responseTime; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getErrorType() { return errorType; }
    public void setErrorType(String errorType) { this.errorType = errorType; }

    public String getRawResponse() { return rawResponse; }
    public void setRawResponse(String rawResponse) { this.rawResponse = rawResponse; }

    public Long getLogId() { return logId; }
    public void setLogId(Long logId) { this.logId = logId; }

    public boolean isSuccess() { return isSuccess; }
    public void setSuccess(boolean success) { this.isSuccess = success; }
}
