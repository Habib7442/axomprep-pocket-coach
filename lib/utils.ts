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
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('127.') || 
      hostname.startsWith('10.') || 
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.startsWith('192.168.') || 
      hostname.startsWith('169.254.') || // Cloud metadata endpoint matches correctly at start
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.startsWith('fe80:') ||
      hostname.startsWith('[fe80:') ||
      /^\[?f[cd][0-9a-f]{2}:/.test(hostname) || // IPv6 Unique Local Address (fc00::/7)
      hostname.includes('::ffff:') // IPv6-mapped IPv4
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(url, { signal: controller.signal });
    
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
    if ((err as any).name === 'AbortError') {
      console.warn('PDF fetch timed out:', url);
    } else {
      console.error('PDF fetch error:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
