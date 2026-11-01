// ============================================================================
// components/StatusBadge.jsx — Color-Coded Status Badge
// ============================================================================
// WHY a dedicated component?
//   Status codes appear in multiple places (API Tester response panel,
//   History table rows, Explorer results). A reusable badge ensures
//   consistent color-coding across the entire app:
//     - 2xx → Green (success)
//     - 4xx → Amber (client error)
//     - 5xx → Red (server error)
//     - null/timeout → Purple (timeout)
//     - empty → Blue (empty state)
//
// The dot indicator (●) before the status code is a common pattern in
// monitoring tools — it draws the eye to the status at a glance.
// ============================================================================

export default function StatusBadge({ status, errorType }) {
  // Determine the visual class based on status code and error type
  const getClass = () => {
    if (errorType === 'TIMEOUT') return 'timeout';
    if (errorType === 'EMPTY_STATE') return 'empty';
    if (errorType === 'MALFORMED_JSON') return 'client-error';
    if (errorType === 'NETWORK_ERROR') return 'server-error';
    if (!status) return 'unknown';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'client-error';
    if (status >= 500) return 'server-error';
    return 'unknown';
  };

  // Human-readable label for non-numeric statuses
  const getLabel = () => {
    if (errorType === 'TIMEOUT') return '⏱ Timeout';
    if (errorType === 'EMPTY_STATE') return `${status} Empty`;
    if (errorType === 'MALFORMED_JSON') return `${status || '?'} Bad JSON`;
    if (errorType === 'NETWORK_ERROR') return '⚠ Network';
    if (!status) return '—';
    return status;
  };

  return (
    <span className={`status-badge ${getClass()}`} title={errorType || `HTTP ${status}`}>
      <span style={{ fontSize: '0.6em' }}>●</span>
      {getLabel()}
    </span>
  );
}
