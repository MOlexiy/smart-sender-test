import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { api, httpClient } from './api'
import { AppLayout } from './AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { WebhookEditPage } from './features/webhooks/WebhookEditPage'
import { WebhooksPage } from './features/webhooks/WebhooksPage'
import { RequireAuth } from './session/RequireAuth'
import { SessionProvider } from './session/SessionProvider'
import { queryClient } from './shared/queryClient'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider api={api} client={httpClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/webhooks" element={<WebhooksPage />} />
                <Route path="/webhooks/:id" element={<WebhookEditPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/webhooks" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  )
}
