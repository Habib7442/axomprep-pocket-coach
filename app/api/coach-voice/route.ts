import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI, Modality } from '@google/genai'

const API_KEY = process.env.GEMINI_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { coachId, audioBase64 } = await req.json()

    // Fetch coach
    const { data: coach } = await supabase
      .from('coaches')
      .select('name, topic, language')
      .eq('id', coachId)
      .eq('user_id', user.id)
      .single()

    if (!coach) return Response.json({ error: 'Coach not found' }, { status: 404 })

    // Fetch user profile for language
    const { data: profile } = await supabase
      .from('profiles')
      .select('native_language')
      .eq('id', user.id)
      .single()

    const lang = profile?.native_language || coach.language || 'english'

    const ai = new GoogleGenAI({ apiKey: API_KEY })

    // Use Gemini to transcribe and respond to audio
    const textResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are "${coach.name}", an AI coach ONLY for "${coach.topic}". 
Respond in ${lang}. If the user asks anything outside ${coach.topic}, politely refuse.
The user has sent a voice message. Based on the transcription or context, respond helpfully about ${coach.topic}.`
              },
              {
                inlineData: {
                  mimeType: 'audio/wav',
                  data: audioBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "HIGH",
          },
        },
      }),
    });

    if (!textResponse.ok) {
      console.error('Voice response generation failed:', await textResponse.text());
      return Response.json({ error: 'Failed to generate response' }, { status: 500 });
    }

    const textData = await textResponse.json();
    const textReply = textData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not understand that.'

    // Now generate TTS for the response
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: textReply }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
      },
    } as any)

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    return Response.json({
      text: textReply,
      audio: audioData || null
    })
  } catch (err: any) {
    console.error('Voice API error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
