import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import type { Webhook, WebhookListParams, WebhookUpdate } from '../../api/types'

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: WebhookListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

export function useWebhookList(params: WebhookListParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => api.webhooks.list(params, signal),
    // Keep the old page on screen while the next one loads (no table flicker).
    placeholderData: keepPreviousData,
  })
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => api.webhooks.get(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: WebhookUpdate) => api.webhooks.update(id, data),
    onSuccess: (webhook: Webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook)
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
