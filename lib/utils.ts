import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export const parseQuizResponse = (text: string): QuizQuestion[] => {
  try {
    // Try to find a JSON block in the markdown response
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error("Failed to parse quiz JSON", e);
    return [];
  }
};
