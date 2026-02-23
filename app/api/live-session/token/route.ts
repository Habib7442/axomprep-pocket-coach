import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is not configured for voice sessions.' },
      { status: 500 }
    );
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Credit check & atomic deduction ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, tier')
    .eq('id', user.id)
    .single();

  // Pro users get unlimited access — only check/deduct for free users
  if (profile?.tier !== 'pro') {
    if (!profile || profile.credits <= 0) {
      return NextResponse.json(
        {
          error: "You've run out of credits! Upgrade your plan to keep chatting.",
          errorCode: 'NO_CREDITS',
          credits: profile?.credits ?? 0,
        },
        { status: 403 }
      );
    }

    const { data: success, error: rpcError } = await supabase.rpc('deduct_credit', {
      user_id: user.id,
      amount: 1
    });

    if (rpcError || !success) {
      return NextResponse.json(
        {
          error: "You've run out of credits! Upgrade your plan to keep chatting.",
          errorCode: 'NO_CREDITS',
          credits: profile?.credits ?? 0,
        },
        { status: 403 }
      );
    }
  }

  // ── Parse request body ────────────────────────────────────────────────────
  try {
    const body = await req.json().catch(() => ({}));
    const { coachName = 'Coach', topic = 'the subject', language = 'English' } = body;

    // Use the server-side SDK (GEMINI_API_KEY never leaves the server)
    // We MUST use v1alpha for the authTokens feature as of now.
    const ai = new GoogleGenAI({
      apiKey,
      //@ts-ignore - apiVersion is supported but might not be in the types yet
      httpOptions: { apiVersion: 'v1alpha' },
    });

    // Create a short-lived ephemeral token for the client to use.
    // The token is locked to a specific model + system instruction.
    // It expires after one use (uses:1) to minimise abuse.
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        liveConnectConstraints: {
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: `You are ${coachName}, an expert coach specialising in ${topic}. 
                  Always respond in ${language}. 
                  Be warm, encouraging, and concise. 
                  Guide the student through the topic with clear, structured explanations 
                  and ask follow-up questions to check understanding.

                  CRITICAL: 
                  - DO NOT output any internal thought processes, planning steps, or labels like "**Acknowledge and Initiate**".
                  - ONLY output the direct response to the user.
                  - Keep your output clean and focused.`,
                },
              ],
            },
          },
        },
      },
    });

    // Fetch the updated credit balance to return to the client
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    // Return the token name — the client uses this as its "apiKey"
    return NextResponse.json(
      { token: token.name, credits: updatedProfile?.credits ?? 0 },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[live-session/token] Error creating ephemeral token:', err);
    return NextResponse.json(
      { error: 'Failed to create voice session token. Please try again.' },
      { status: 500 }
    );
  }
}
