import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page since this is a private portal
  redirect('/login')
}