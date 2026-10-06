import { useEffect, useEffectEvent, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  delay?: number
}

/** Debounced input whose committed value is owned by the parent (the URL). */
export function SearchInput({ value, onChange, delay = 350 }: Props) {
  const [draft, setDraft] = useState(value)
  const [committed, setCommitted] = useState(value)

  // The URL changed from outside (back/forward) — show its value.
  if (value !== committed) {
    setCommitted(value)
    setDraft(value)
  }

  const commit = useEffectEvent((next: string) => onChange(next))

  useEffect(() => {
    if (draft.trim() === value) return
    const timer = setTimeout(() => commit(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, delay])

  return (
    <input
      type="search"
      className="search"
      placeholder="Search by name…"
      aria-label="Search webhooks by name"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}
