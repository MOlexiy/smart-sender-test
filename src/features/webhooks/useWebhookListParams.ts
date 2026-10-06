import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

export const PAGE_SIZE = 10

function parsePage(raw: string | null): number {
  const page = Number(raw)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/**
 * List state lives in the URL (?page=&search=) — it survives reloads and works with back/forward.
 * Defaults are omitted from the URL to keep it clean.
 */
export function useWebhookListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''

  const setPage = useCallback(
    (next: number, options?: { replace?: boolean }) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (next > 1) params.set('page', String(next))
        else params.delete('page')
        return params
      }, options)
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (next: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        const value = next.trim()
        if (value) params.set('search', value)
        else params.delete('search')
        params.delete('page') // new search always starts from page 1
        return params
      })
    },
    [setSearchParams],
  )

  return { page, search, limit: PAGE_SIZE, setPage, setSearch }
}
