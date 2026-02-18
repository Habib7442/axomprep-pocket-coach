'use client'

import { useUser, useSession } from '@clerk/nextjs'
import { useEffect } from 'react'
import { createClerkSupabaseClient } from '@/lib/supabase'

export default function UserSync() {
  const { isLoaded, user } = useUser()
  const { session } = useSession()

  useEffect(() => {
    if (!isLoaded || !user || !session) return

    const syncUser = async () => {
      try {
        // Use the native Clerk session token (no template needed for native integration)
        const token = await session.getToken()
        
        if (!token) {
          console.warn('Waiting for Clerk session token...')
          return
        }

        const supabaseClient = createClerkSupabaseClient(token)

        // Upsert user into public.users
        const { data, error, status } = await supabaseClient
          .from('users')
          .upsert({
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            tier: 'free'
          }, {
            onConflict: 'clerk_id'
          })
          .select()

        if (error) {
          console.error('Supabase Sync Error:', error.message, 'Status:', status)
          if (status === 403) {
            console.error('Hint: This usually means RLS policies denied the request. Ensure "auth.uid()" in Supabase matches Clerk ID.')
          }
        } else {
          console.log('success')
        }
      } catch (err) {
        console.error('Sync execution failed:', err)
      }
    }

    syncUser()
  }, [isLoaded, user, session])

  return null
}
