import { getProfile } from './actions'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  return <ProfileClient profile={profile} />
}
