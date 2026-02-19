'use server';

import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export const syncUser = async () => {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
        return null;
    }

    const supabase = await createSupabaseServer();
    
    const { data, error } = await supabase
        .from('users')
        .upsert({
            clerk_id: userId,
            email: user.primaryEmailAddress?.emailAddress,
            tier: 'free' // Default tier
        }, {
            onConflict: 'clerk_id'
        })
        .select()
        .single();

    if (error) {
        console.error('Error syncing user:', error.message);
        return null;
    }

    return data;
};

export const getCoaches = async () => {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching coaches:', error.message);
        return [];
    }

    return data;
};

export const getUserTier = async () => {
    const { userId } = await auth();
    if (!userId) return 'free';

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
        .from('users')
        .select('tier')
        .eq('clerk_id', userId)
        .single();

    if (error || !data) return 'free';
    return data.tier;
};

export const getCoach = async (id: string) => {
    const { userId } = await auth();
    if (!userId) return null;

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching coach:', error.message);
        return null;
    }

    return data;
};

export const getMessages = async (coachId: string) => {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
        .from('messages') 
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error.message);
        return [];
    }

    // Map to Message interface
    return data.map(m => ({
        role: m.role,
        content: m.content
    }));
};

export const validateCoachCreation = async () => {
    const user = await currentUser();
    if (!user) return { allowed: false, error: "Unauthorized" };

    const supabase = await createSupabaseServer();
    const tier = await getUserTier();
    
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    
    const { count, error } = await supabase
        .from('coaches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

    if (error) return { allowed: false, error: error.message };

    const limit = tier === 'pro' ? 20 : 2;
    if ((count || 0) >= limit) {
        return { 
            allowed: false, 
            error: `Monthly limit reached. ${tier === 'pro' ? 'Pro' : 'Free'} users can create up to ${limit} coaches per month.`,
            errorCode: 'LIMIT_REACHED'
        };
    }

    return { allowed: true };
};

export const createCoach = async (coachData: any) => {
    const user = await currentUser();
    
    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const supabase = await createSupabaseServer();
    
    // 1. Check user tier
    const tier = await getUserTier();
    
    // 2. Count coaches for this month
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    
    const { count, error: countError } = await supabase
        .from('coaches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

    if (countError) {
        return { data: null, error: countError.message };
    }

    const limit = tier === 'pro' ? 20 : 2;
    if ((count || 0) >= limit) {
        return { 
            data: null, 
            error: `Monthly limit reached. ${tier === 'pro' ? 'Pro' : 'Free'} users can create up to ${limit} coaches per month.`,
            errorCode: 'LIMIT_REACHED'
        };
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
        return { data: null, error: error.message };
    }

    revalidatePath('/dashboard');
    return { data, error: null };
};
