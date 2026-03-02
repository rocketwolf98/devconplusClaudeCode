import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { router } from './router'
import { useThemeStore, PROGRAM_THEMES } from './stores/useThemeStore'

export default function App() {
  const { themeId } = useThemeStore()

  useEffect(() => {
    const allClasses = PROGRAM_THEMES.map((t) => t.cssClass)
    document.documentElement.classList.remove(...allClasses)
    const theme = PROGRAM_THEMES.find((t) => t.id === themeId)
    if (theme) document.documentElement.classList.add(theme.cssClass)
  }, [themeId])

  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
