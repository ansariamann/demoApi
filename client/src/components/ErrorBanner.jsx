// ============================================================================
// components/ErrorBanner.jsx — Contextual Error Display
// ============================================================================
// WHY a dedicated error component?
//   Different error types need different visual treatments:
//     - Timeout → Purple, with a clock icon and retry suggestion
//     - HTTP Error → Red, with the status code prominently displayed
//     - Malformed JSON → Amber, warning that parsing failed
//     - Empty State → Blue, informational (it's not really an "error")
//     - Network Error → Red, suggesting the server may be down
//     - Validation → Amber, showing what input was wrong
//
//   Each type gets a unique icon, color, title, and description.
//   This makes the tool genuinely useful for debugging — the user
//   immediately knows WHAT went wrong, not just that something failed.
//
// ANIMATION:
//   The slideIn animation (defined in index.css) makes errors appear
//   smoothly instead of popping in abruptly. This reduces the visual
//   jarring when rapid requests produce rapid errors.
// ============================================================================

export default function ErrorBanner({ errorType, error, statusCode }) {
  if (!errorType && !error) return null;

  // Map error types to their visual configuration
  const config = getErrorConfig(errorType, error, statusCode);

  return (
    <div className={`error-banner ${config.className}`}>
      <span className="banner-icon">{config.icon}</span>
      <div className="banner-content">
        <h4>{config.title}</h4>
        <p>{error || config.defaultMessage}</p>
      </div>
    </div>
  );
}

// ============================================================================
// getErrorConfig — Map error type to visual config
// ============================================================================
// WHY a function instead of inline ternaries?
//   This is easier to maintain and test. Adding a new error type only
//   requires adding a new case, not editing JSX.
// ============================================================================
function getErrorConfig(errorType, error, statusCode) {
  switch (errorType) {
    case 'TIMEOUT':
      return {
        className: 'timeout',
        icon: '⏱️',
        title: 'Request Timed Out',
        defaultMessage: 'The API did not respond within the timeout period. The server may be hanging under load.'
      };

    case 'HTTP_ERROR':
      return {
        className: 'http-error',
        icon: '❌',
        title: `HTTP Error ${statusCode || ''}`,
        defaultMessage: 'The API returned an error response.'
      };

    case 'MALFORMED_JSON':
      return {
        className: 'malformed-json',
        icon: '⚠️',
        title: 'Malformed JSON Response',
        defaultMessage: 'The API returned data that could not be parsed as valid JSON.'
      };

    case 'EMPTY_STATE':
      return {
        className: 'empty-state',
        icon: '📭',
        title: 'Empty Response',
        defaultMessage: 'The request succeeded (200 OK) but returned no data.'
      };

    case 'NETWORK_ERROR':
      return {
        className: 'network-error',
        icon: '🌐',
        title: 'Network Error',
        defaultMessage: 'Could not reach the server. Check your connection or the server may be down.'
      };

    case 'VALIDATION_ERROR':
      return {
        className: 'validation-error',
        icon: '📝',
        title: 'Validation Error',
        defaultMessage: 'The request was invalid. Check your inputs.'
      };

    default:
      return {
        className: 'http-error',
        icon: '❗',
        title: 'Error',
        defaultMessage: error || 'An unexpected error occurred.'
      };
  }
}
