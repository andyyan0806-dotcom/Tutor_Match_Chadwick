export function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => onChange(n)} title={`${n} star${n > 1 ? 's' : ''}`}>
          {n <= value ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

export function StarDisplay({ value, count }) {
  const filled = Math.round(value)
  return (
    <span className="rating-row">
      <span className="stars">{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>
      <span>{value?.toFixed(1)} ({count} review{count !== 1 ? 's' : ''})</span>
    </span>
  )
}
