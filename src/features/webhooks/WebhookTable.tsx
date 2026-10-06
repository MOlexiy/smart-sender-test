import { Link, useLocation } from 'react-router'
import type { Webhook } from '../../api/types'

export interface WebhookEditState {
  /** List URL search to return to after editing. */
  listSearch: string
}

export function WebhookTable({ webhooks }: { webhooks: Webhook[] }) {
  const location = useLocation()
  const state: WebhookEditState = { listSearch: location.search }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>URL</th>
          <th>Status</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {webhooks.map((webhook) => (
          <tr key={webhook.id}>
            <td>{webhook.name}</td>
            <td className="table__url">{webhook.url}</td>
            <td>
              <span className={webhook.active ? 'badge badge--on' : 'badge badge--off'}>
                {webhook.active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="table__actions">
              <Link to={`/webhooks/${webhook.id}`} state={state}>
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
