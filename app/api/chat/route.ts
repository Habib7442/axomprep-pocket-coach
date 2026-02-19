import { NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function POST(req: Request) {
  try {
    const { message, history, coach } = await req.json();

    if (!message || !coach) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = `You are ${coach.name}, an elite personal AI learning coach. 
Your expertise is in: ${coach.topic}.
Target Student Level: ${coach.className || 'General'}.
Target Exam (if any): ${coach.examName || 'Standard Learning'}.
Language Objective: You MUST explain everything in ${coach.language}. Use simple, clear, and encouraging tone.

${coach.pdfUrl ? "DOCUMENT CONTEXT: I have provided a PDF document that contains the primary learning material. Use this document as your main source of truth for explanations." : ""}

Behavioral Guidelines:
1. Act like a supportive mentor.
2. Break down complex concepts into small, digestible parts.
3. If the user asks something outside of ${coach.topic}, gently guide them back to the subject.
4. Use formatting (bolding, lists) to make explanations clear.
5. If technical terms are used, explain them in the context of the ${coach.language} language.`;

    let contents: any[] = [
      {
        role: "user",
        parts: [{ text: "System Instruction: " + systemPrompt }]
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am " + coach.name + ", ready to help." }]
      },
      ...history.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }))
    ];

    // Handle PDF attachment if exists
    if (coach.pdfUrl) {
      try {
        const pdfResponse = await fetch(coach.pdfUrl);
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const base64Pdf = Buffer.from(pdfBuffer).toString("base64");
        
        // Add PDF to the very first user message where we provide system instructions
        contents[0].parts.push({
          inlineData: {
            data: base64Pdf,
            mimeType: "application/pdf"
          }
        });
      } catch (e) {
        console.error("Error fetching/processing PDF:", e);
      }
    }

    // Add final user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const payload = { contents };

    const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Gemini 3 API Error:", JSON.stringify(errorData, null, 2));
        return NextResponse.json({ 
          error: "Gemini 3 API failure", 
          details: errorData.error?.message || "Check your API key or model availability." 
        }, { status: response.status });
    }

    const data = await response.json();
    
    // Validate response structure to avoid the "empty output" error
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.warn("Gemini returned empty response. Safety filters might be high or payload structure issues.");
      return NextResponse.json({ 
        text: "I'm sorry, I'm having trouble processing that right now. Could you try rephrasing your question?" 
      });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
