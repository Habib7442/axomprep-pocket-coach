import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coachId = searchParams.get('coachId');

    if (!coachId) {
      return NextResponse.json({ error: "Missing coachId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify coach ownership
    const { data: coach } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', coachId)
      .eq('user_id', user.id)
      .single();

    if (!coach) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('coach_id', coachId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch messages error:', error);
      return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Chat messages GET error:', err);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { coachId, role, content } = await req.json();

    if (!coachId || !role || !content) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify coach ownership
    const { data: coachOwner } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', coachId)
      .eq('user_id', user.id)
      .single();

    if (!coachOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        coach_id: coachId,
        user_id: user.id,
        role,
        content
      })
      .select()
      .single();

    if (error) {
        console.error('Save message error:', error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Chat messages POST error:', error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
