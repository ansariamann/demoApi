// ============================================================================
// pages/QueryInterface.jsx — Database Query Interface (SQL Editor)
// ============================================================================
// This page addresses the requirement:
//   "Build a page where users can write custom queries to fetch and analyze
//    the stored API response data directly from their database."
//
// FEATURES:
//   1. SQL editor textarea with monospace font styling
//   2. Schema reference panel — shows all columns in request_logs table
//   3. Preset query chips — click to auto-fill common queries
//   4. Run Query button with execution time display
//   5. Results rendered in a clean data table
//   6. Row count and query echo
//
// WHY RAW SQL INSTEAD OF A FILTER BUILDER?
//   The assignment says "Write a query to fetch all failed requests
//   (Status > 399) or requests that took longer than 2000ms." This
//   implies SQL-like query capability. A raw SQL editor is:
//     1. More powerful — users can write any SELECT query
//     2. More educational — demonstrates SQL knowledge
//     3. More realistic — mirrors tools like Grafana or BigQuery
//   The preset chips cover common cases for users who don't know SQL.
//
// SECURITY NOTE:
//   The backend validates that only SELECT queries are allowed.
//   Users cannot INSERT, UPDATE, DELETE, or DROP through this interface.
// ============================================================================

import { useState, useEffect } from 'react';
import { executeQuery, fetchQueryPresets, fetchSchema } from '../api/client';

export default function QueryInterface() {
  // ---- State ----
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState([]);
  const [schema, setSchema] = useState([]);

  // ---- Load presets and schema on mount ----
  useEffect(() => {
    loadPresets();
    loadSchema();
  }, []);

  async function loadPresets() {
    const data = await fetchQueryPresets();
    if (data.presets) setPresets(data.presets);
  }

  async function loadSchema() {
    const data = await fetchSchema();
    if (data.columns) setSchema(data.columns);
  }

  // ---- Execute the SQL query ----
  const runQuery = async () => {
    if (!sql.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await executeQuery(sql);

    if (response.error) {
      setError(response.error);
    } else {
      setResult(response);
    }

    setLoading(false);
  };

  // ---- Apply a preset query ----
  const applyPreset = (preset) => {
    setSql(preset.sql);
    // Don't auto-execute — let the user review the query first
  };

  // ---- Keyboard shortcut: Ctrl+Enter to run ----
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  // ---- Extract column headers from result data ----
  // WHY dynamic columns? Different queries return different column sets.
  // A query for "SELECT id, endpoint" should only show those 2 columns,
  // not all 14 columns from the full schema.
  const getColumns = () => {
    if (!result?.data?.length) return [];
    return Object.keys(result.data[0]);
  };

  // ---- Format cell values for display ----
  const formatCell = (value) => {
    if (value === null || value === undefined) return <span className="text-muted">null</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toLocaleString();

    // Truncate long strings (like response bodies) in the table
    const str = String(value);
    if (str.length > 100) {
      return (
        <span title={str}>
          {str.slice(0, 100)}
          <span className="text-muted">... ({str.length} chars)</span>
        </span>
      );
    }
    return str;
  };

  return (
    <div className="fade-in" onKeyDown={handleKeyDown}>
      <div className="page-header">
        <h2>Query Interface</h2>
        <p>
          Write SQL queries to analyze stored API request data
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>Ctrl+Enter to run</span>
        </p>
      </div>

      {/* ================================================================== */}
      {/* SCHEMA REFERENCE — Shows available columns                        */}
      {/* WHY show the schema? Users writing SQL need to know column names. */}
      {/* This panel eliminates guesswork.                                  */}
      {/* ================================================================== */}
      {schema.length > 0 && (
        <div className="schema-ref">
          <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-sm)' }}>
            📊 Table: <code>request_logs</code> — Available columns:
          </p>
          <div className="schema-columns">
            {schema.map(col => (
              <span key={col.name} className="schema-col" title={`${col.type}${col.nullable ? ', nullable' : ''}`}>
                {col.name}
                <span className="text-muted" style={{ marginLeft: 4, fontSize: '0.65rem' }}>
                  {col.type}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PRESET QUERY CHIPS                                                 */}
      {/* WHY presets? Not every user knows SQL. Presets give useful starting */}
      {/* points and also serve as documentation for the table schema.       */}
      {/* ================================================================== */}
      {presets.length > 0 && (
        <div>
          <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-sm)' }}>
            Quick queries:
          </p>
          <div className="preset-chips">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                className="preset-chip"
                onClick={() => applyPreset(preset)}
                title={preset.description}
                id={`preset-${idx}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SQL EDITOR                                                         */}
      {/* ================================================================== */}
      <div style={{ marginTop: 'var(--space-md)' }}>
        <div className="sql-editor">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT * FROM request_logs WHERE status_code > 399 ORDER BY id DESC"
            id="sql-editor"
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-md)'
        }}>
          <button
            className="btn btn-primary"
            onClick={runQuery}
            disabled={loading || !sql.trim()}
            id="run-query-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span> Running...
              </>
            ) : (
              <>▶ Run Query</>
            )}
          </button>

          {result && (
            <span className="text-sm text-secondary">
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
              in {result.executionTime}ms
            </span>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* ERROR DISPLAY                                                      */}
      {/* ================================================================== */}
      {error && (
        <div className="error-banner validation-error" style={{ marginTop: 'var(--space-md)' }}>
          <span className="banner-icon">❌</span>
          <div className="banner-content">
            <h4>Query Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESULTS TABLE                                                      */}
      {/* WHY a dynamic table? The columns change based on the SELECT query. */}
      {/* We extract column names from the first result row.                 */}
      {/* ================================================================== */}
      {result?.data && result.data.length > 0 && (
        <div className="data-table-wrapper" style={{ marginTop: 'var(--space-lg)' }}>
          <table className="data-table" id="query-results">
            <thead>
              <tr>
                {getColumns().map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, idx) => (
                <tr key={idx}>
                  {getColumns().map(col => (
                    <td key={col} className={typeof row[col] === 'number' ? 'mono' : ''}>
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty result set */}
      {result?.data && result.data.length === 0 && (
        <div className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="empty-icon">📭</div>
          <h3>No results</h3>
          <p>Your query returned 0 rows. Try adjusting your WHERE clause.</p>
        </div>
      )}

      {/* Initial empty state */}
      {!result && !error && (
        <div className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="empty-icon">🗄️</div>
          <h3>Write a SQL Query</h3>
          <p>Select a preset or write your own SQL to query the request logs database</p>
        </div>
      )}
    </div>
  );
}
