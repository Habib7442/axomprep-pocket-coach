import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coachId')
  const before = searchParams.get('before') // created_at cursor

  if (!coachId || !before) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch PAGE_SIZE messages older than the cursor (newest first, then reverse)
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('coach_id', coachId)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reverse to show oldest first
  const sorted = (messages || []).reverse()

  return NextResponse.json({
    messages: sorted,
    hasMore: sorted.length === PAGE_SIZE
  })
}
