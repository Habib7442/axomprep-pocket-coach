'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { ...data, email: user.email, avatar_url: user.user_metadata?.avatar_url }
}

export async function updateProfile(formData: {
  full_name?: string
  profession?: string
  student_class?: string
  native_language?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('profiles')
    .update({
      ...formData,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
