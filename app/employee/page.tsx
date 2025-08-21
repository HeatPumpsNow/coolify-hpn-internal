import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to employee portal
  redirect('/employee/login');
}