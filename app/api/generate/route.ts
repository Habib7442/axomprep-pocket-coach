import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateGeminiText, generateGeminiImage } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { prompt, type } = await req.json();

    if (type === "image") {
      const result = await generateGeminiImage(prompt);
      const data = await result.json();
      return NextResponse.json(data);
    } else {
      const response = await generateGeminiText(prompt, type as "learn" | "quiz");
      return new Response(response.body);
    }
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
}
