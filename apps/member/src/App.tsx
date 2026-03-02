import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { router } from './router'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
