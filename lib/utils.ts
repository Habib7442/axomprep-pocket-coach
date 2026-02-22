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
export function isValidExternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and private IP ranges to prevent SSRF
    if (
      hostname === 'localhost' || 
      hostname.startsWith('127.') || 
      hostname.startsWith('10.') || 
      hostname.startsWith('172.16.') || // Standard private range
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('192.168.') || 
      hostname.includes('169.254') // Cloud metadata endpoint
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchPdfAsBase64(url: string): Promise<string | null> {
  const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB limit
  
  if (!isValidExternalUrl(url)) {
    console.warn('Blocked invalid/internal PDF URL:', url);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;
    
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) {
      console.warn('PDF too large, skipping:', url);
      return null;
    }
    
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_SIZE) return null;
    
    return Buffer.from(buffer).toString('base64');
  } catch (err) {
    console.error('PDF fetch error:', err);
    return null;
  }
}
