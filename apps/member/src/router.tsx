import { createBrowserRouter } from 'react-router-dom'
import MemberLayout from './components/MemberLayout'
import OrganizerLayout from './components/OrganizerLayout'

// Auth pages (no tab nav)
import SplashScreen from './pages/auth/SplashScreen'
import Onboarding from './pages/auth/Onboarding'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import OrganizerCodeGate from './pages/auth/OrganizerCodeGate'

// Member tab pages
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
import NewsDetail from './pages/news/NewsDetail'
import Profile from './pages/profile/Profile'
import ProfileEdit from './pages/profile/ProfileEdit'
import Notifications from './pages/profile/Notifications'
import Privacy from './pages/profile/Privacy'
import NotificationsInbox from './pages/notifications/NotificationsInbox'

// Organizer pages
import { OrgDashboard } from './pages/organizer/Dashboard'
import { OrgEventManagement } from './pages/organizer/events/EventManagement'
import { OrgEventCreate } from './pages/organizer/events/EventCreate'
import { OrgEventDetail } from './pages/organizer/events/EventDetail'
import { OrgEventRegistrants } from './pages/organizer/events/EventRegistrants'
import { OrgQRScanner } from './pages/organizer/scan/QRScanner'
import { OrgRewardsManagement } from './pages/organizer/rewards/RewardsManagement'
import { OrgProfile } from './pages/organizer/profile/Profile'
import { OrgProfileEdit } from './pages/organizer/profile/ProfileEdit'

export const router = createBrowserRouter([
  // Root — always start at onboarding
  { path: '/',                     element: <SplashScreen /> },

  // Auth routes — no layout
  { path: '/onboarding',           element: <Onboarding /> },
  { path: '/sign-in',              element: <SignIn /> },
  { path: '/sign-up',              element: <SignUp /> },
  { path: '/organizer-code-gate',  element: <OrganizerCodeGate /> },

  // Member routes — wrapped in MemberLayout with bottom tab nav
  {
    element: <MemberLayout />,
    children: [
      { path: '/home',                       element: <Dashboard /> },
      { path: '/events',                    element: <EventsList /> },
      { path: '/events/:id',                element: <EventDetail /> },
      { path: '/events/:id/register',       element: <EventRegister /> },
      { path: '/events/:id/pending',        element: <EventPending /> },
      { path: '/events/:id/ticket',         element: <EventTicket /> },
      { path: '/jobs',                      element: <JobsList /> },
      { path: '/jobs/:id',                  element: <JobDetail /> },
      { path: '/points',                    element: <Points /> },
      { path: '/points/history',            element: <PointsHistory /> },
      { path: '/news/:id',                  element: <NewsDetail /> },
      { path: '/rewards',                   element: <Rewards /> },
      { path: '/profile',                   element: <Profile /> },
      { path: '/profile/edit',              element: <ProfileEdit /> },
      { path: '/notifications',             element: <NotificationsInbox /> },
      { path: '/profile/notifications',     element: <Notifications /> },
      { path: '/profile/privacy',           element: <Privacy /> },
    ],
  },

  // Organizer routes — wrapped in OrganizerLayout (guards on isOrganizerSession)
  {
    element: <OrganizerLayout />,
    children: [
      { path: '/organizer',                              element: <OrgDashboard /> },
      { path: '/organizer/events',                       element: <OrgEventManagement /> },
      { path: '/organizer/events/create',                element: <OrgEventCreate /> },
      { path: '/organizer/events/:id',                   element: <OrgEventDetail /> },
      { path: '/organizer/events/:id/registrants',       element: <OrgEventRegistrants /> },
      { path: '/organizer/scan',                         element: <OrgQRScanner /> },
      { path: '/organizer/rewards',                      element: <OrgRewardsManagement /> },
      { path: '/organizer/profile',                      element: <OrgProfile /> },
      { path: '/organizer/profile/edit',                 element: <OrgProfileEdit /> },
      { path: '/organizer/notifications',                 element: <NotificationsInbox isOrganizer /> },
      { path: '/organizer/profile/notifications',        element: <Notifications /> },
      { path: '/organizer/profile/privacy',              element: <Privacy /> },
    ],
  },
])
