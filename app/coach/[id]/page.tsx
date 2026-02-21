import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CoachChatClient from './CoachChatClient'

const PAGE_SIZE = 20

export default async function CoachChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!coach) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('native_language, profession, student_class, credits')
    .eq('id', user.id)
    .single()

  // Get total message count
  const { count: totalCount } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', id)

  // Fetch only the latest PAGE_SIZE messages (ordered newest first, then reversed)
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('coach_id', id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  // Reverse to show oldest first in the UI
  const sortedMessages = (messages || []).reverse()

  return (
    <CoachChatClient
      coach={coach}
      initialMessages={sortedMessages}
      userLanguage={profile?.native_language || 'english'}
      totalMessageCount={totalCount || 0}
      initialCredits={profile?.credits ?? 0}
    />
  )
}
