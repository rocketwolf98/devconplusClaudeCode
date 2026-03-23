import { createPortal } from 'react-dom'

export function OrgQRScanner() {

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <p className="text-white text-sm">Scanner coming…</p>
    </div>,
    document.body
  )
}
