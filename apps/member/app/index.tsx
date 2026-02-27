import { Redirect } from 'expo-router'

// Root index — redirect to onboarding on first load.
// Auth guard logic will be added once Supabase is provisioned.
export default function Index() {
  return <Redirect href="/(auth)/onboarding" />
}
