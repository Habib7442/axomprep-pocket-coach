
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAIImage, generateTextResponse } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { coachId, topic, language } = await req.json();

    // 1. Generate an optimized visual prompt for the infographic
    const promptGen = `Create a highly detailed, professional visual prompt for an educational infographic about "${topic}". 
    The prompt should be in English and specify: 
    - A clean, modern educational aesthetic
    - Clear diagrams or representative icons
    - Professional lighting and layout
    - Focus on educational clarity.
    Return ONLY the prompt text.`;

    const visualPrompt = await generateTextResponse(promptGen);

    // 2. Generate the image
    const base64Image = await generateAIImage(visualPrompt, "16:9");
    const imageUrl = `data:image/png;base64,${base64Image}`;

    // 3. Save to Supabase
    const { data, error } = await supabase
      .from('infographics')
      .insert({
        coach_id: coachId,
        image_url: imageUrl,
        prompt: visualPrompt
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Infographic Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
