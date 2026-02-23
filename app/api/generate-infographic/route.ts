import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const maxDuration = 60

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured')

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, topic } = await req.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Credit check — pro users skip deduction
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, tier')
      .eq('id', user.id)
      .single()

    if (profile?.tier !== 'pro') {
      const { data: success, error: rpcError } = await supabase.rpc('deduct_credit', {
        user_id: user.id,
        amount: 1,
      })
      if (rpcError || !success) {
        return NextResponse.json(
          { error: "You've run out of credits!", errorCode: 'NO_CREDITS' },
          { status: 403 }
        )
      }
    }

    // Build a clear, concise infographic prompt
    const summary = content.slice(0, 2000) // keep prompt lean
    const prompt = `Create a beautiful, modern educational infographic in a 16:9 landscape format (widescreen).

Topic: "${topic || 'Educational Content'}"

Content to visualize:
${summary}

Requirements:
- Clean, professional infographic design
- 16:9 landscape aspect ratio
- Use sections/panels to organize key concepts
- Include icons, diagrams, or simple illustrations where helpful
- Color palette: warm oranges, warm whites, and dark text for readability
- Large bold headings for each section
- Key facts highlighted in call-out boxes
- Everything explained visually in a single image
- No extra white space or borders around the image
- Do NOT include any URLs or website addresses
- Style: modern, educational, concise`

    // Call Gemini image generation endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini image gen error:', err)
      return NextResponse.json({ error: 'Image generation failed. Try again.' }, { status: 500 })
    }

    const data = await response.json()

    // Extract the image part
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))

    if (!imagePart) {
      console.error('No image in response:', JSON.stringify(data, null, 2))
      return NextResponse.json({ error: 'No image generated. Try again.' }, { status: 500 })
    }

    return NextResponse.json({
      image: imagePart.inlineData.data,          // base64 string
      mimeType: imagePart.inlineData.mimeType,   // e.g. "image/png"
    })
  } catch (err) {
    console.error('generate-infographic error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
