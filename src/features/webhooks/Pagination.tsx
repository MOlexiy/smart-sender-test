interface Props {
  page: number
  lastPage: number
  total: number
  pageSize: number
  disabled?: boolean
  onChange: (page: number) => void
}

export function Pagination({ page, lastPage, total, pageSize, disabled, onChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        {from}–{to} of {total}
      </span>
      <div className="pagination__controls">
        <button type="button" className="btn" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          ← Prev
        </button>
        <span>
          Page {page} / {lastPage}
        </span>
        <button
          type="button"
          className="btn"
          disabled={disabled || page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </nav>
  )
}
