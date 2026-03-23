import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export function OrgQRScanner() {
  const navigate = useNavigate()

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <p className="text-white text-sm">Scanner coming…</p>
    </div>,
    document.body
  )
}
