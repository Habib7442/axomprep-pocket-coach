'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to fetch profile:', error)
    return null
  }

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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (formData.full_name !== undefined) updates.full_name = formData.full_name
  if (formData.profession !== undefined) updates.profession = formData.profession
  if (formData.student_class !== undefined) updates.student_class = formData.student_class
  if (formData.native_language !== undefined) updates.native_language = formData.native_language

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  revalidatePath('/', 'layout')
}
