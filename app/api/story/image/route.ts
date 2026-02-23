import { NextRequest, NextResponse } from 'next/server';
import { generateAIImage } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // gemini-3-pro-image-preview is used inside generateAIImage as per lib/gemini.ts
    const base64Image = await generateAIImage(prompt, aspectRatio);

    return NextResponse.json({ image: base64Image });
  } catch (error: any) {
    console.error('Image generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
