import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'

// Fetch PDF from URL and convert to base64
async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { coachId, message } = await req.json()

    // Check user credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, native_language, profession, student_class')
      .eq('id', user.id)
      .single()

    if (!profile || profile.credits <= 0) {
      return NextResponse.json({ 
        error: 'You\'ve run out of credits! Upgrade your plan to keep chatting.',
        errorCode: 'NO_CREDITS',
        credits: 0
      }, { status: 403 })
    }

    // Fetch coach info
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .eq('user_id', user.id)
      .single()

    if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })

    const lang = profile?.native_language || coach.language || 'english'

    // Fetch chat history (last 20 messages for context)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Save user message
    await supabase.from('chat_messages').insert({
      coach_id: coachId,
      user_id: user.id,
      role: 'user',
      content: message
    })

    // Fetch PDF as base64 if coach has one
    let pdfBase64: string | null = null
    if (coach.pdf_url) {
      pdfBase64 = await fetchPdfAsBase64(coach.pdf_url)
    }

    // Build system prompt
    const systemPrompt = `You are an expert AI coach named "${coach.name}" that ONLY helps with the topic: "${coach.topic}".

CRITICAL RULES:
1. You MUST ONLY answer questions related to "${coach.topic}". This is your ONLY area of expertise.
2. If the user asks ANYTHING outside of "${coach.topic}", politely but firmly refuse and redirect them back to "${coach.topic}".
   Example refusal: "I'm your ${coach.topic} coach — I can only help with ${coach.topic} related questions!"
3. Answer in ${lang} language. Always respond in ${lang}.
4. Be detailed, educational, and engaging. Use examples, analogies, and structured explanations.
5. Use markdown formatting (headers, bold, lists, code blocks if relevant).
6. If the user is a student${profile?.student_class ? ` in ${profile.student_class}` : ''}, adapt your explanations to their level.
7. When explaining concepts, break them down step by step.
${pdfBase64 ? `8. The user has uploaded a PDF reference document (provided inline). READ IT CAREFULLY. Use its content to answer questions directly. When asked about the PDF, quote from it accurately.` : ''}

YOUR TOPIC: "${coach.topic}" — DO NOT deviate from this under any circumstances.`

    // Build the system + greeting turn parts
    // If PDF exists, attach it inline to the system message
    const systemParts: any[] = [{ text: systemPrompt }]
    if (pdfBase64) {
      systemParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      })
    }

    // Build conversation for Gemini
    const contents: any[] = [
      { role: 'user', parts: systemParts },
      { 
        role: 'model', 
        parts: [{ text: `Understood! I am ${coach.name}, your dedicated ${coach.topic} coach.${pdfBase64 ? ' I have read the uploaded PDF document and will use it to answer your questions.' : ''} I will only answer questions about ${coach.topic} and reply in ${lang}. How can I help you today?` }] 
      },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    // Call Gemini
    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents,
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "HIGH",
          },
        },
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error:', errText)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'

    // Save assistant message
    await supabase.from('chat_messages').insert({
      coach_id: coachId,
      user_id: user.id,
      role: 'assistant',
      content: aiReply
    })

    // Deduct 1 credit per message
    await supabase.rpc('deduct_credit', { user_id: user.id })

    return NextResponse.json({ 
      reply: aiReply, 
      credits: profile.credits - 1 
    })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
