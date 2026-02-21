import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'

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

    const { coachId } = await req.json()

    // Fetch coach and profile info
    const [{ data: coach }, { data: profile }] = await Promise.all([
      supabase.from('coaches').select('*').eq('id', coachId).single(),
      supabase.from('profiles').select('native_language, student_class').eq('id', user.id).single()
    ])

    if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })

    const lang = profile?.native_language || coach.language || 'english'

    let pdfBase64: string | null = null
    if (coach.pdf_url) {
      pdfBase64 = await fetchPdfAsBase64(coach.pdf_url)
    }

    const systemPrompt = `You are an expert quiz generator for "${coach.topic}".
Generate exactly 20 Multiple Choice Questions (MCQs) in ${lang} language.
${pdfBase64 ? 'Use the provided PDF document as the primary source for the questions.' : ''}
The questions should be suitable for a student${profile?.student_class ? ` in ${profile.student_class}` : ''}.

Return ONLY a JSON array of objects with this structure:
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }
]
No other text or formatting. Just the JSON array.`

    const contents: any[] = [
      { 
        role: 'user', 
        parts: [
          { text: systemPrompt },
          ...(pdfBase64 ? [{
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64
            }
          }] : [])
        ] 
      }
    ]

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
        const err = await response.text()
        console.error("Gemini Error:", err)
        return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
    }

    const data = await response.json()
    let quizResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Clean JSON if needed
    quizResponse = quizResponse.replace(/```json\n?|\n?```/g, '').trim()

    try {
        const questions = JSON.parse(quizResponse)
        return NextResponse.json({ questions })
    } catch (e) {
        console.error("Failed to parse quiz JSON", quizResponse)
        return NextResponse.json({ error: 'Invalid quiz format generated' }, { status: 500 })
    }

  } catch (err: any) {
      console.error("Quiz API Error:", err)
      return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
