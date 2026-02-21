import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI, Modality } from '@google/genai'

const API_KEY = process.env.GEMINI_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text, mode, language } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    const ai = new GoogleGenAI({ apiKey: API_KEY })

    // Generate a conversational script first
    let scriptPrompt = ''
    if (mode === 'podcast') {
      scriptPrompt = `Convert the following lesson content into a dynamic 2-person podcast script in ${language || 'English'} between a Host (Joe) and a Guest (Jane).
Format it exactly like this:
Joe: [Text]
Jane: [Text]
Keep it natural, educational, and fun.
Content: ${text}`
    } else {
      scriptPrompt = `Convert the following lesson content into a warm, engaging storytelling narration in ${language || 'English'}. 
Do not include any stage directions or meta-text. Just the spoken words.
Content: ${text}`
    }

    const scriptResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: scriptPrompt }] }],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "HIGH",
          },
        },
      }),
    });

    if (!scriptResponse.ok) {
      console.error('Script generation failed:', await scriptResponse.text());
      return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
    }

    const scriptData = await scriptResponse.json();
    const finalScript = scriptData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!finalScript) return NextResponse.json({ error: 'Failed to generate script content' }, { status: 500 })

    // Generate TTS
    const ttsParams: any = {
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: finalScript }] }],
      config: {
        responseModalities: [Modality.AUDIO],
      },
    }

    if (mode === 'podcast') {
      ttsParams.config.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          ],
        },
      }
    } else {
      ttsParams.config.speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      }
    }

    const response = await ai.models.generateContent(ttsParams)
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!base64Audio) return NextResponse.json({ error: 'No audio data received' }, { status: 500 })

    return NextResponse.json({ audio: base64Audio })
  } catch (err: any) {
    console.error('TTS error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
