// ============================================================================
// pages/History.jsx — Request History Log
// ============================================================================
// This page provides a "log of all past API requests made" as required.
//
// FEATURES:
//   1. Stats cards at top — total, successes, failures, avg response time
//   2. Filter bar — filter by method, status, and error type
//   3. Sortable data table with all request details
//   4. Click-to-expand rows — shows full request/response JSON
//   5. Auto-refresh toggle — poll for new entries every 5 seconds
//   6. Color-coded status badges and method badges
//
// WHY STATS + TABLE?
//   Just a table would meet the requirements, but the stats cards give
//   instant insight ("30% of my requests are failing!") which is what
//   a monitoring tool should do. It's the difference between Datadog
//   and a raw log file.
//
// WHY CLIENT-SIDE EXPAND?
//   The table shows summary columns (timestamp, method, endpoint, status, time).
//   Clicking a row fetches the full detail (including response body) on demand.
//   This keeps the initial load fast even with hundreds of entries.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { fetchHistory, fetchHistoryStats } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import JsonViewer from '../components/JsonViewer';

export default function History() {
  // ---- State ----
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ---- Load data ----
  const loadData = useCallback(async () => {
    const filters = {};
    if (statusFilter) filters.status = statusFilter;
    if (methodFilter) filters.method = methodFilter;
    if (errorTypeFilter) filters.error_type = errorTypeFilter;
    filters.limit = 200;

    const [historyResult, statsResult] = await Promise.all([
      fetchHistory(filters),
      fetchHistoryStats()
    ]);

    if (historyResult.data) setLogs(historyResult.data);
    if (statsResult.stats) setStats(statsResult);
    setLoading(false);
  }, [statusFilter, methodFilter, errorTypeFilter]);

  // Load on mount and when filters change
  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 seconds when enabled
  // WHY 5 seconds? Fast enough to feel "live" but not so fast that it
  // causes flickering or excessive network traffic.
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Toggle expanded row
  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Format timestamp for display
  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  // Safely parse a JSON string for display
  const safeParse = (str) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Request History</h2>
        <p>View and analyze all API requests logged by the proxy</p>
      </div>

      {/* ================================================================== */}
      {/* STATS CARDS — Quick overview of request distribution               */}
      {/* WHY these 5 metrics? They answer the most common questions:        */}
      {/*   "How many requests?" "What's my success rate?" "How fast?"       */}
      {/* ================================================================== */}
      {stats?.stats && (
        <div className="stats-grid">
          <div className="stat-card cyan">
            <div className="stat-value">{stats.stats.total || 0}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card emerald">
            <div className="stat-value">{stats.stats.successes || 0}</div>
            <div className="stat-label">Successful</div>
          </div>
          <div className="stat-card rose">
            <div className="stat-value">{stats.stats.failures || 0}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{stats.stats.avg_response_time || 0}<span style={{ fontSize: '0.9rem', fontWeight: 400 }}>ms</span></div>
            <div className="stat-label">Avg Response Time</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">{stats.stats.max_response_time || 0}<span style={{ fontSize: '0.9rem', fontWeight: 400 }}>ms</span></div>
            <div className="stat-label">Max Response Time</div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* FILTER BAR — Narrow down the log entries                           */}
      {/* ================================================================== */}
      <div className="filter-bar" id="filter-bar">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Method</label>
          <select className="form-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Error Type</label>
          <select className="form-select" value={errorTypeFilter} onChange={(e) => setErrorTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="TIMEOUT">Timeout</option>
            <option value="HTTP_ERROR">HTTP Error</option>
            <option value="MALFORMED_JSON">Malformed JSON</option>
            <option value="EMPTY_STATE">Empty State</option>
            <option value="NETWORK_ERROR">Network Error</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData} id="refresh-btn">
            🔄 Refresh
          </button>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            id="auto-refresh-btn"
          >
            {autoRefresh ? '⏸ Auto' : '▶ Auto'}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* DATA TABLE — The main history log                                  */}
      {/* ================================================================== */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div>
          <h3 style={{ marginTop: 16 }}>Loading history...</h3>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No requests found</h3>
          <p>Make some API requests from the Explorer or Tester page to see them here</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table" id="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Time</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  {/* ---- Summary Row ---- */}
                  <tr
                    key={log.id}
                    onClick={() => toggleRow(log.id)}
                    style={{ cursor: 'pointer' }}
                    id={`history-row-${log.id}`}
                  >
                    <td className="mono">{log.id}</td>
                    <td className="text-sm">{formatTime(log.timestamp)}</td>
                    <td>
                      <span className={`method-badge ${log.method?.toLowerCase()}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="mono">{log.endpoint || log.url}</td>
                    <td>
                      <StatusBadge status={log.status_code} errorType={log.error_type} />
                    </td>
                    <td className="mono">{log.response_time}ms</td>
                    <td className="text-sm text-muted">
                      {log.error_type || (log.is_success ? '—' : 'Error')}
                    </td>
                  </tr>

                  {/* ---- Expanded Detail Row ---- */}
                  {/* WHY a separate row? We can't nest a div inside a table.
                      A full-width <td colSpan> gives us space for the detail view. */}
                  {expandedRow === log.id && (
                    <tr key={`${log.id}-detail`} className="row-detail">
                      <td colSpan={7}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                          {/* Request Details */}
                          <div>
                            <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                              Request
                            </h4>
                            <p className="text-sm" style={{ marginBottom: 'var(--space-xs)' }}>
                              <strong>URL:</strong>{' '}
                              <span className="mono">{log.url}</span>
                            </p>
                            {log.query_params && (
                              <div style={{ marginTop: 'var(--space-sm)' }}>
                                <p className="text-sm text-secondary" style={{ marginBottom: 4 }}>Query Params:</p>
                                <JsonViewer data={safeParse(log.query_params)} />
                              </div>
                            )}
                            {log.request_body && (
                              <div style={{ marginTop: 'var(--space-sm)' }}>
                                <p className="text-sm text-secondary" style={{ marginBottom: 4 }}>Body:</p>
                                <JsonViewer data={safeParse(log.request_body)} />
                              </div>
                            )}
                            {log.error_message && (
                              <div style={{ marginTop: 'var(--space-sm)' }}>
                                <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>
                                  <strong>Error:</strong> {log.error_message}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Response Details */}
                          <div>
                            <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                              Response
                            </h4>
                            <JsonViewer data={safeParse(log.response_body)} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record count */}
      {logs.length > 0 && (
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-md)', textAlign: 'right' }}>
          Showing {logs.length} records
          {autoRefresh && ' • Auto-refreshing every 5s'}
        </p>
      )}
    </div>
  );
}
