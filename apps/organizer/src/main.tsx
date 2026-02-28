import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'
import DesktopGuard from './components/DesktopGuard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopGuard>
      <RouterProvider router={router} />
    </DesktopGuard>
  </StrictMode>,
)
