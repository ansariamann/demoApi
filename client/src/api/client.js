// ============================================================================
// api/client.js — Centralized API Client
// ============================================================================
// WHY a centralized client?
//   Instead of scattering fetch() calls across components, this module
//   provides a clean API for all backend communication. Benefits:
//     1. Single place to change the backend URL
//     2. Consistent error handling
//     3. Frontend-side timeout as defense-in-depth (the backend also has timeouts)
//     4. Easy to add auth headers later (for the discussion question)
// ============================================================================

const API_BASE = 'http://localhost:3001/api';

// Frontend timeout — 10 seconds.
// WHY 10s when the backend uses 8s? Defense-in-depth. The backend should
// abort at 8s, but if the backend itself is slow (e.g., DB write takes long),
// we still want the frontend to give up at 10s. The 2s buffer lets the
// backend's timeout response arrive before the frontend times out.
const FRONTEND_TIMEOUT_MS = 10000;

// ============================================================================
// proxyRequest — Send a request through our Express proxy
// ============================================================================
// This is the main function used by Explorer and API Tester pages.
// It sends the request details to our backend, which forwards them to ShipIQ
// and logs the result.
//
// Parameters:
//   method      — HTTP method (GET, POST, PUT, DELETE)
//   path        — ShipIQ endpoint path (e.g., "/logs")
//   queryParams — Object of query parameters
//   headers     — Object of custom headers
//   body        — Request body (for POST/PUT)
//   signal      — Optional AbortSignal for cancellation from the UI
//
// Returns a structured response object, never throws.
// ============================================================================
export async function proxyRequest({ method, path, queryParams = {}, headers = {}, body = null, signal = null }) {
  // Create our own timeout controller if no external signal provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRONTEND_TIMEOUT_MS);

  // If an external signal is provided (e.g., from a Cancel button),
  // link it to our controller so either can abort the request.
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(`${API_BASE}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, path, queryParams, headers, body }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        status: null,
        data: null,
        responseTime: FRONTEND_TIMEOUT_MS,
        error: 'Request cancelled or timed out on the client side',
        errorType: 'TIMEOUT',
        isSuccess: false
      };
    }

    return {
      status: null,
      data: null,
      responseTime: 0,
      error: `Client error: ${err.message}`,
      errorType: 'NETWORK_ERROR',
      isSuccess: false
    };
  }
}

// ============================================================================
// fetchMetadata — Get API endpoint metadata from ShipIQ
// ============================================================================
// WHY fetch metadata through the proxy? We could hit ShipIQ directly,
// but going through our backend means the metadata request is also logged.
// However, for simplicity and because metadata rarely fails, we fetch it
// directly. If it fails, we show a retry button.
// ============================================================================
export async function fetchMetadata() {
  try {
    const response = await fetch('https://shipiq-backend-service.onrender.com/metadata', {
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ============================================================================
// fetchHistory — Get request history from our backend
// ============================================================================
// Used by the History page to display all past API calls.
// Supports filtering by status, method, and error type.
// ============================================================================
export async function fetchHistory(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.method) params.set('method', filters.method);
    if (filters.error_type) params.set('error_type', filters.error_type);
    if (filters.limit) params.set('limit', filters.limit);

    const queryString = params.toString();
    const url = `${API_BASE}/history${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);
    return await response.json();
  } catch (err) {
    return { data: [], error: err.message };
  }
}

// ============================================================================
// fetchHistoryStats — Get aggregate statistics
// ============================================================================
export async function fetchHistoryStats() {
  try {
    const response = await fetch(`${API_BASE}/history/stats`);
    return await response.json();
  } catch (err) {
    return { stats: null, error: err.message };
  }
}

// ============================================================================
// executeQuery — Run a SQL query against the database
// ============================================================================
// Used by the Query Interface page. Sends the SQL string to the backend
// which validates it (SELECT only) and executes it against SQLite.
// ============================================================================
export async function executeQuery(sql) {
  try {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    return await response.json();
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ============================================================================
// fetchQueryPresets — Get preset query examples
// ============================================================================
export async function fetchQueryPresets() {
  try {
    const response = await fetch(`${API_BASE}/query/presets`);
    return await response.json();
  } catch (err) {
    return { presets: [], error: err.message };
  }
}

// ============================================================================
// fetchSchema — Get the database table schema
// ============================================================================
export async function fetchSchema() {
  try {
    const response = await fetch(`${API_BASE}/query/schema`);
    return await response.json();
  } catch (err) {
    return { columns: [], error: err.message };
  }
}
