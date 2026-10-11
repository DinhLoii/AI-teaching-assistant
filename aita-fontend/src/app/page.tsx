import { redirect } from 'next/navigation'
import LoginPage from '@/features/auth/screens/LoginPage'

export default function Page() {
  redirect('/login')
}
