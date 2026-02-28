import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import DesktopGuard from './components/DesktopGuard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopGuard>
      <App />
    </DesktopGuard>
  </StrictMode>,
)
