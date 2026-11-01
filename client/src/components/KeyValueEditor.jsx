// ============================================================================
// components/KeyValueEditor.jsx — Dynamic Key-Value Pair Editor
// ============================================================================
// WHY a separate component?
//   The API Tester page needs key-value editors for both Headers and
//   Query Parameters. Instead of duplicating the UI logic, this component
//   is reusable — just pass different labels.
//
// DESIGN:
//   Each row has a Key input, Value input, and a Remove button (✕).
//   The "Add" button at the bottom creates new empty rows.
//   Controlled component pattern — parent owns the state via onChange.
//
// WHY controlled inputs?
//   The parent component (ApiTester) needs access to all key-value pairs
//   to build the request. Controlled inputs ensure the parent always has
//   the current values without needing refs or DOM queries.
// ============================================================================

export default function KeyValueEditor({ pairs, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  // Update a specific pair at the given index
  const updatePair = (index, field, value) => {
    const updated = pairs.map((pair, i) =>
      i === index ? { ...pair, [field]: value } : pair
    );
    onChange(updated);
  };

  // Remove a pair at the given index
  const removePair = (index) => {
    const updated = pairs.filter((_, i) => i !== index);
    // Always keep at least one empty row for UX — an empty editor
    // with no rows would look broken.
    onChange(updated.length > 0 ? updated : [{ key: '', value: '' }]);
  };

  // Add a new empty pair at the end
  const addPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  return (
    <div className="kv-editor">
      {pairs.map((pair, index) => (
        <div className="kv-row" key={index}>
          <input
            type="text"
            className="form-input"
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => updatePair(index, 'key', e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            placeholder={valuePlaceholder}
            value={pair.value}
            onChange={(e) => updatePair(index, 'value', e.target.value)}
          />
          <button
            className="remove-btn"
            onClick={() => removePair(index)}
            title="Remove this pair"
            type="button"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={addPair}
        style={{ alignSelf: 'flex-start' }}
      >
        + Add Row
      </button>
    </div>
  );
}
