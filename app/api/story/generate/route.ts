import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiText } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { topic, style = 'comic-style', length = 5 } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const prompt = `
      Create a highly engaging, professional ${style} story about: "${topic}".
      
      The story should be structured for a 10-page book. 
      For each page, provide:
      1. Dramatic, immersive text (narrative).
      2. A highly detailed image prompt for a professional visual artist (comic/cinematic style).
      3. A "voiceover" script optimized for text-to-speech.

      Return ONLY a JSON object with this exact structure:
      {
        "title": "Dramatic Title",
        "description": "Short summary",
        "pages": [
          {
            "pageNumber": 1,
            "text": "The narrative text for the page...",
            "imagePrompt": "Detailed visual description for Gemini 3 Pro Image model...",
            "voiceover": "Script for the voiceover...",
            "style": "${style}"
          }
        ]
      }
      
      Ensure the story is educational but exciting.
      Return ONLY valid JSON. No conversational text.
    `;

    const response = await generateGeminiText(prompt);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought)?.text || "";
    
    // Clean JSON response
    const cleanedJson = text.replace(/```json\n|```/g, "").trim();
    const parsedStory = JSON.parse(cleanedJson);

    return NextResponse.json(parsedStory);
  } catch (error: any) {
    console.error('Story generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
