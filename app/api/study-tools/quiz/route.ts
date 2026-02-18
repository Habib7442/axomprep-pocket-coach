
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateTextResponse } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { coachId, topic, language } = await req.json();

    const prompt = `Generate a 15-question multiple choice quiz about "${topic}" in ${language}. 
    Each question should have 4 options and 1 correct answer (index 0-3). 
    Return the response as a JSON array of objects with fields: question, options (array of 4 strings), and correctAnswer (index).
    Format instructions: Return ONLY valid JSON, no markdown fences.`;

    const text = await generateTextResponse(prompt);
    
    let quizData;
    try {
      quizData = JSON.parse(text.replace(/```json\n|```/g, "").trim());
    } catch (e) {
      console.error("JSON Parse Error:", text);
      throw new Error("Failed to parse quiz JSON");
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        coach_id: coachId,
        data: quizData
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Quiz Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
