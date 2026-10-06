import { useEffect } from 'react'
import { Alert, EmptyState, Spinner } from '../../shared/ui'
import { Pagination } from './Pagination'
import { useWebhookList } from './queries'
import { SearchInput } from './SearchInput'
import { useWebhookListParams } from './useWebhookListParams'
import { WebhookTable } from './WebhookTable'

export function WebhooksPage() {
  const { page, search, limit, setPage, setSearch } = useWebhookListParams()
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useWebhookList({ page, limit, search })

  // ?page=99 from an old link: snap to the last existing page.
  const lastPage = data?.paging.pages.last
  useEffect(() => {
    if (!isPlaceholderData && lastPage !== undefined && page > lastPage) setPage(lastPage, { replace: true })
  }, [isPlaceholderData, lastPage, page, setPage])

  return (
    <section>
      <header className="page-header">
        <h2>Webhooks</h2>
        {isFetching && !isPending && <Spinner label="Updating…" />}
      </header>

      <SearchInput value={search} onChange={setSearch} />

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <Alert
          action={
            <button type="button" className="btn" onClick={() => void refetch()}>
              Retry
            </button>
          }
        >
          Failed to load webhooks.
        </Alert>
      ) : data.data.length === 0 ? (
        <EmptyState>{search ? `No webhooks match “${search}”.` : 'No webhooks yet.'}</EmptyState>
      ) : (
        <div className={isPlaceholderData ? 'is-stale' : undefined}>
          <WebhookTable webhooks={data.data} />
          <Pagination
            page={data.paging.pages.current}
            lastPage={data.paging.pages.last}
            total={data.paging.results.total}
            pageSize={data.paging.results.limitation}
            disabled={isPlaceholderData}
            onChange={setPage}
          />
        </div>
      )}
    </section>
  )
}
