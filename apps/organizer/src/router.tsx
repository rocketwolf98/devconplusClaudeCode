import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { EventsList } from './pages/events/EventsList'
import { EventCreate } from './pages/events/EventCreate'
import { EventDetail } from './pages/events/EventDetail'
import { EventRegistrants } from './pages/events/EventRegistrants'
import { QRScanner } from './pages/scan/QRScanner'
import { Profile } from './pages/profile/Profile'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'events', element: <EventsList /> },
      { path: 'events/create', element: <EventCreate /> },
      { path: 'events/:id', element: <EventDetail /> },
      { path: 'events/:id/registrants', element: <EventRegistrants /> },
      { path: 'scan', element: <QRScanner /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
])
