import { createBrowserRouter } from 'react-router-dom'
import MemberLayout from './components/MemberLayout'

// Auth pages (no tab nav)
import Onboarding from './pages/auth/Onboarding'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'

// Tab pages
import Dashboard from './pages/dashboard/Dashboard'
import EventsList from './pages/events/EventsList'
import EventDetail from './pages/events/EventDetail'
import EventRegister from './pages/events/EventRegister'
import EventPending from './pages/events/EventPending'
import EventTicket from './pages/events/EventTicket'
import JobsList from './pages/jobs/JobsList'
import JobDetail from './pages/jobs/JobDetail'
import Points from './pages/points/Points'
import PointsHistory from './pages/points/PointsHistory'
import Rewards from './pages/rewards/Rewards'
import Profile from './pages/profile/Profile'
import ProfileEdit from './pages/profile/ProfileEdit'
import Notifications from './pages/profile/Notifications'
import Privacy from './pages/profile/Privacy'

export const router = createBrowserRouter([
  // Auth routes — no MemberLayout
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/sign-in',    element: <SignIn /> },
  { path: '/sign-up',    element: <SignUp /> },

  // App routes — all wrapped in MemberLayout with bottom tab nav
  {
    element: <MemberLayout />,
    children: [
      { path: '/',                          element: <Dashboard /> },
      { path: '/events',                    element: <EventsList /> },
      { path: '/events/:id',                element: <EventDetail /> },
      { path: '/events/:id/register',       element: <EventRegister /> },
      { path: '/events/:id/pending',        element: <EventPending /> },
      { path: '/events/:id/ticket',         element: <EventTicket /> },
      { path: '/jobs',                      element: <JobsList /> },
      { path: '/jobs/:id',                  element: <JobDetail /> },
      { path: '/points',                    element: <Points /> },
      { path: '/points/history',            element: <PointsHistory /> },
      { path: '/rewards',                   element: <Rewards /> },
      { path: '/profile',                   element: <Profile /> },
      { path: '/profile/edit',              element: <ProfileEdit /> },
      { path: '/profile/notifications',     element: <Notifications /> },
      { path: '/profile/privacy',           element: <Privacy /> },
    ],
  },
])
