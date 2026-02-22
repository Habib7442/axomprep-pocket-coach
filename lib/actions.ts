'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export const syncUser = async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return null;
    }

    // Check if profile exists
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('SYNC_USER: Profile fetch failed', error);
        return null;
    }

    return profile;
};

export const getCoaches = async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching coaches:', error.message);
        return [];
    }

    return data;
};

export const getUserTier = async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'free';

    const { data, error } = await supabase
        .from('profiles')
        .select('credits, tier')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        return 'free';
    }
    
    // Prioritize the tier column, fallback to credits check
    return data.tier || (data.credits > 0 ? 'pro' : 'free'); 
};

export const getCoach = async (id: string) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Error fetching coach:', error.message);
        return null;
    }

    return data;
};

export const getMessages = async (coachId: string) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // First verify coach ownership
    const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', coachId)
        .eq('user_id', user.id)
        .single();
        
    if (!coach) return [];

    const { data, error } = await supabase
        .from('chat_messages') 
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error.message);
        return [];
    }

    return data.map((m: any) => ({
        role: m.role,
        content: m.content
    }));
};

export const validateCoachCreation = async (): Promise<{ allowed: boolean; error?: string; errorCode?: string }> => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { allowed: false, error: "Unauthorized" };
    }

    // Since coach creation is now free, we still want a sensible limit to prevent spam.
    // Let's allow up to 20 coaches per user for now.
    const { count, error } = await supabase
        .from('coaches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (error) {
        return { allowed: false, error: "Failed to validate coach limit" };
    }

    const MAX_COACHES = 20;
    if (count !== null && count >= MAX_COACHES) {
        return { 
            allowed: false, 
            error: `You have reached the maximum limit of ${MAX_COACHES} coaches.`,
            errorCode: "LIMIT_REACHED"
        };
    }

    return { allowed: true };
};

export const createCoach = async (coachData: any) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const validation = await validateCoachCreation();
    if (!validation.allowed) {
        return { data: null, error: validation.error };
    }

    const { data, error } = await supabase
        .from('coaches')
        .insert([{
            ...coachData,
            user_id: user.id
        }])
        .select()
        .single();

    if (error) {
        return { data: null, error: "Failed to create coach" };
    }
    revalidatePath('/dashboard');
    return { data, error: null };
};

export const saveQuizResult = async (resultData: any) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
        .from('quiz_results')
        .insert([{
            ...resultData,
            user_id: user.id
        }])
        .select()
        .single();

    if (error) {
        console.error('Error saving quiz result:', error.message);
        return { data: null, error: "Failed to save quiz result" };
    }

    return { data, error: null };
};

export const submitTestimonial = async (formData: { name: string; role?: string; content: string; rating: number }) => {
    const supabase = await createClient();

    // Validate required fields exist and are strings
    if (!formData.name || typeof formData.name !== 'string' || formData.name.trim().length === 0) {
        return { success: false, error: "Name is required" };
    }

    if (!formData.content || typeof formData.content !== 'string' || formData.content.trim().length === 0) {
        return { success: false, error: "Content is required" };
    }

    // Validate rating is within expected range
    if (typeof formData.rating !== 'number' || formData.rating < 1 || formData.rating > 5 || !Number.isInteger(formData.rating)) {
        return { success: false, error: "Rating must be an integer between 1 and 5" };
    }
    
    // Validate content length
    if (formData.content.length > 1000) {
        return { success: false, error: "Content exceeds maximum length" };
    }
    
    const { data, error } = await supabase
        .from('testimonials')
        .insert([
            {
                name: formData.name,
                role: formData.role,
                content: formData.content,
                rating: formData.rating,
                is_approved: false // Moderation by default
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error submitting testimonial:', error.message);
        return { success: false, error: "Failed to submit testimonial" };
    }

    return { success: true, data };
};

export const getApprovedTestimonials = async () => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching testimonials:', error.message);
        return [];
    }

    return data;
};
