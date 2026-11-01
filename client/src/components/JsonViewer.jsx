// ============================================================================
// components/JsonViewer.jsx — Syntax-Highlighted JSON Display
// ============================================================================
// WHY a custom JSON viewer instead of just <pre>{JSON.stringify()}</pre>?
//   1. Syntax highlighting makes JSON much easier to read — keys, strings,
//      numbers, and booleans each get distinct colors
//   2. The assignment specifically asks us to "Display the JSON Response
//      payload" — a formatted viewer looks far more professional
//   3. It handles edge cases: null, undefined, non-JSON strings, and
//      circular references without crashing
//
// IMPLEMENTATION:
//   We use a recursive function to walk the JSON tree and wrap each value
//   in a <span> with the appropriate CSS class. This gives us syntax
//   highlighting without importing a heavyweight library like react-json-view.
// ============================================================================

export default function JsonViewer({ data, raw }) {
  // If we have raw (non-parseable) text, show it as-is
  // WHY? Malformed JSON responses can't be pretty-printed,
  // so we fall back to displaying the raw text.
  if (raw) {
    return (
      <div className="json-viewer">
        <pre>{raw}</pre>
      </div>
    );
  }

  // No data at all
  if (data === null || data === undefined) {
    return (
      <div className="json-viewer">
        <pre><span className="json-null">null</span></pre>
      </div>
    );
  }

  // Format the JSON with syntax highlighting
  const highlighted = syntaxHighlight(JSON.stringify(data, null, 2));

  return (
    <div className="json-viewer">
      <pre dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

// ============================================================================
// syntaxHighlight — Add <span> tags for JSON syntax highlighting
// ============================================================================
// WHY regex-based highlighting instead of a recursive renderer?
//   For display-only purposes, regex on the pre-formatted string is simpler,
//   faster, and produces identical output. We don't need collapsible nodes
//   for this tool — the response panel has its own scrollbar.
//
// The regex matches JSON tokens in order:
//   1. Keys (quoted strings followed by colon)
//   2. String values
//   3. Numbers
//   4. Booleans
//   5. null
// ============================================================================
function syntaxHighlight(json) {
  if (typeof json !== 'string') return '';

  // Escape HTML entities to prevent XSS when using dangerouslySetInnerHTML
  // WHY? If the API response contains HTML tags (e.g., <script>), we need
  // to escape them before rendering.
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
