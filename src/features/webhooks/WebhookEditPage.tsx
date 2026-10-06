import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { Alert, Spinner } from '../../shared/ui'
import { useUpdateWebhook, useWebhook } from './queries'
import type { WebhookEditState } from './WebhookTable'
import { WebhookForm } from './WebhookForm'

export function WebhookEditPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const navigate = useNavigate()

  // Return to the same list page/search the user came from.
  const listUrl = `/webhooks${(location.state as WebhookEditState | null)?.listSearch ?? ''}`
  const backToList = () => void navigate(listUrl)

  const { data: webhook, isPending, isError, error, refetch } = useWebhook(id)
  const update = useUpdateWebhook(id)

  let content
  if (!Number.isInteger(id) || id <= 0 || isApiError(error, 404)) {
    content = <Alert>Webhook not found.</Alert>
  } else if (isPending) {
    content = <Spinner />
  } else if (isError) {
    content = (
      <Alert
        action={
          <button type="button" className="btn" onClick={() => void refetch()}>
            Retry
          </button>
        }
      >
        Failed to load the webhook.
      </Alert>
    )
  } else {
    content = (
      <WebhookForm
        // Remount the form when another webhook is opened so defaults reset.
        key={webhook.id}
        webhook={webhook}
        onCancel={backToList}
        onSubmit={async (data) => {
          await update.mutateAsync(data)
          backToList()
        }}
      />
    )
  }

  return (
    <section>
      <header className="page-header">
        <h2>Edit webhook</h2>
        <Link to={listUrl}>← Back to list</Link>
      </header>
      {content}
    </section>
  )
}
