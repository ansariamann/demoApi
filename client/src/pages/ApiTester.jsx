// ============================================================================
// pages/ApiTester.jsx — Postman-like API Testing Interface
// ============================================================================
// This page addresses the "Postman-like API Tester" requirement:
//   - URL input bar with method dropdown (GET, POST, PUT, DELETE)
//   - Dynamic inputs for Headers, Query Parameters, and JSON Body
//   - Response panel with status code, response time, and formatted JSON
//   - Auto-saves every request through the proxy (to the database)
//
// WHY A SEPARATE PAGE FROM EXPLORER?
//   Explorer is for structured, guided API browsing (forms from metadata).
//   API Tester is for free-form exploration (like Postman) where the user
//   can type any URL, any headers, any body. Power users need this for
//   debugging edge cases the metadata doesn't cover.
//
// CANCEL BUTTON:
//   When a request is in-flight, the Send button transforms into a Cancel
//   button. Clicking it aborts the request via AbortController. This is
//   critical because 10% of API calls hang for 20 seconds.
// ============================================================================

import { useState, useRef } from 'react';
import { proxyRequest } from '../api/client';
import KeyValueEditor from '../components/KeyValueEditor';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';
import ErrorBanner from '../components/ErrorBanner';

// The base URL of the ShipIQ API — shown to the user as a reference
const BASE_URL = 'https://shipiq-backend-service.onrender.com';

export default function ApiTester() {
  // ---- Request State ----
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/logs');
  const [activeTab, setActiveTab] = useState('params');

  // Query parameters as key-value pairs
  // WHY start with one empty row? It's better UX than showing an empty
  // editor — the user sees the inputs immediately.
  const [queryParams, setQueryParams] = useState([{ key: '', value: '' }]);

  // Headers as key-value pairs
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);

  // Request body (raw JSON string)
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState(null);

  // ---- Response State ----
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---- AbortController ref for cancellation ----
  // WHY a ref? We need to access the controller across renders (when the
  // user clicks Cancel). A ref persists across renders without causing
  // re-renders (unlike state).
  const abortRef = useRef(null);

  // ---- Validate JSON body ----
  // WHY validate before sending? Sending invalid JSON to the backend would
  // waste a round trip. Better to catch it client-side and show an error.
  const validateBody = (text) => {
    setBody(text);
    if (!text.trim()) {
      setBodyError(null);
      return;
    }
    try {
      JSON.parse(text);
      setBodyError(null);
    } catch (e) {
      setBodyError(e.message);
    }
  };

  // ---- Send Request ----
  const sendRequest = async () => {
    // Don't send if body is invalid JSON
    if (bodyError) return;

    setLoading(true);
    setResponse(null);

    // Create abort controller for this request
    const controller = new AbortController();
    abortRef.current = controller;

    // Convert key-value pairs to objects
    // WHY filter empty keys? The user might have empty rows they haven't
    // filled in yet. We don't want to send ?=&= as query params.
    const qp = {};
    queryParams.forEach(({ key, value }) => {
      if (key.trim()) qp[key.trim()] = value;
    });

    const hdrs = {};
    headers.forEach(({ key, value }) => {
      if (key.trim()) hdrs[key.trim()] = value;
    });

    // Parse body if present
    let parsedBody = null;
    if (body.trim() && ['POST', 'PUT'].includes(method)) {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        // Already validated above, but just in case
        parsedBody = null;
      }
    }

    const result = await proxyRequest({
      method,
      path: path.startsWith('/') ? path : `/${path}`,
      queryParams: qp,
      headers: hdrs,
      body: parsedBody,
      signal: controller.signal
    });

    setResponse(result);
    setLoading(false);
    abortRef.current = null;
  };

  // ---- Cancel Request ----
  const cancelRequest = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  // ---- Keyboard shortcut: Ctrl+Enter to send ----
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!loading) sendRequest();
    }
  };

  return (
    <div className="fade-in" onKeyDown={handleKeyDown}>
      <div className="page-header">
        <h2>API Tester</h2>
        <p>
          Build and test API requests against{' '}
          <span className="text-mono" style={{ color: 'var(--accent-cyan)' }}>{BASE_URL}</span>
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>Ctrl+Enter to send</span>
        </p>
      </div>

      {/* ================================================================== */}
      {/* URL BAR — The centerpiece of the Postman interface                 */}
      {/* Method dropdown + path input + Send/Cancel button in one row       */}
      {/* ================================================================== */}
      <div className="url-bar" id="url-bar">
        <select
          className="method-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          id="method-select"
          style={{ color: `var(--method-${method.toLowerCase()})` }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>

        <input
          type="text"
          className="url-input"
          placeholder="/logs?count=10"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          id="url-input"
        />

        {loading ? (
          <button className="cancel-btn" onClick={cancelRequest} id="cancel-btn">
            ✕ Cancel
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={sendRequest}
            disabled={!path.trim()}
            id="send-btn"
          >
            Send ▶
          </button>
        )}
      </div>

      {/* ================================================================== */}
      {/* TABS — Switch between Params, Headers, and Body inputs             */}
      {/* WHY tabs? Showing all three editors at once would be overwhelming. */}
      {/* Tabs keep the interface clean while still accessible.              */}
      {/* ================================================================== */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'params' ? 'active' : ''}`}
            onClick={() => setActiveTab('params')}
          >
            Query Params
            {queryParams.some(p => p.key.trim()) && (
              <span style={{
                marginLeft: 6,
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem'
              }}>
                {queryParams.filter(p => p.key.trim()).length}
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            Headers
            {headers.some(h => h.key.trim()) && (
              <span style={{
                marginLeft: 6,
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem'
              }}>
                {headers.filter(h => h.key.trim()).length}
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            Body
            {body.trim() && (
              <span style={{
                marginLeft: 6,
                width: 6, height: 6,
                borderRadius: '50%',
                background: bodyError ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                display: 'inline-block'
              }} />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
          {activeTab === 'params' && (
            <KeyValueEditor
              pairs={queryParams}
              onChange={setQueryParams}
              keyPlaceholder="Parameter name"
              valuePlaceholder="Value"
            />
          )}

          {activeTab === 'headers' && (
            <KeyValueEditor
              pairs={headers}
              onChange={setHeaders}
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
            />
          )}

          {activeTab === 'body' && (
            <div>
              <div className="sql-editor">
                <textarea
                  placeholder='{\n  "resource": "logs",\n  "count": 5\n}'
                  value={body}
                  onChange={(e) => validateBody(e.target.value)}
                  style={{
                    color: bodyError ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    minHeight: 150
                  }}
                  id="body-editor"
                />
              </div>
              {bodyError && (
                <p style={{
                  color: 'var(--accent-rose)',
                  fontSize: '0.8rem',
                  marginTop: 'var(--space-sm)'
                }}>
                  ⚠ Invalid JSON: {bodyError}
                </p>
              )}
              {['GET', 'DELETE'].includes(method) && body.trim() && (
                <p style={{
                  color: 'var(--accent-amber)',
                  fontSize: '0.8rem',
                  marginTop: 'var(--space-sm)'
                }}>
                  ℹ Body will be ignored for {method} requests
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* RESPONSE PANEL                                                     */}
      {/* Shows status, timing, and formatted JSON after a request executes  */}
      {/* ================================================================== */}
      {loading && (
        <div className="card" style={{ marginTop: 'var(--space-lg)', textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }}></div>
          <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
            Waiting for response...
          </p>
          <p className="text-muted text-sm">
            Request will timeout after 8 seconds if the API hangs
          </p>
        </div>
      )}

      {response && !loading && (
        <div className="response-panel" style={{ marginTop: 'var(--space-lg)' }} id="response-panel">
          {/* Error Banner */}
          {response.errorType && (
            <div style={{ padding: 'var(--space-md) var(--space-lg) 0' }}>
              <ErrorBanner
                errorType={response.errorType}
                error={response.error}
                statusCode={response.status}
              />
            </div>
          )}

          {/* Response Header with status + timing */}
          <div className="response-header">
            <div className="response-meta">
              <div className="meta-item">
                <span>Status:</span>
                <StatusBadge status={response.status} errorType={response.errorType} />
              </div>
              <div className="meta-item">
                <span>Time:</span>
                <span className="meta-value">{response.responseTime}ms</span>
              </div>
              {response.logId && (
                <div className="meta-item">
                  <span>Log ID:</span>
                  <span className="meta-value">#{response.logId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Response Body */}
          <div className="response-body">
            <JsonViewer data={response.data} raw={response.rawResponse} />
          </div>
        </div>
      )}

      {/* Empty state when no request has been made yet */}
      {!response && !loading && (
        <div className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="empty-icon">🚀</div>
          <h3>Ready to send</h3>
          <p>Enter an endpoint path and click Send to make a request</p>
        </div>
      )}
    </div>
  );
}
