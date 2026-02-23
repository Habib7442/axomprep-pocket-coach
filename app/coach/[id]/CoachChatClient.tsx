'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Send, Loader2, Mic, MicOff, Volume2, BookOpen,
  Mic2, Sparkles, Play, Pause, Download, X, Bot, User as UserIcon,
  ChevronUp, MessageSquarePlus, Zap, BrainCircuit, CheckCircle2, AlertCircle, Trophy,
  Copy, Check, Gamepad2, FileText, Download as DownloadIcon, Image as ImageIcon
} from 'lucide-react'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogMedia
} from '@/components/ui/alert-dialog'
import { GoogleGenAI, Modality } from '@google/genai'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

// ── Copy Button Component ──────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500/80 hover:text-orange-600 transition-all group px-2.5 py-1.5 rounded-xl hover:bg-orange-50/50"
    >
      {copied ? (
        <><Check className="w-3 h-3 text-green-600" /><span className="text-green-600">Copied!</span></>
      ) : (
        <><Copy className="w-3 h-3 transition-transform group-hover:rotate-6" /><span>Copy</span></>
      )}
    </button>
  )
}

// ── Download PDF Component ────────────────────────────────────────────────
function DownloadPDFButton({ messageId, content }: { messageId: string, content: string }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 48
      const maxW = pageW - margin * 2
      let y = 56

      // Helper: strip inline markdown
      const strip = (s: string) =>
        s.replace(/\*\*(.*?)\*\*/g, '$1')
         .replace(/\*(.*?)\*/g, '$1')
         .replace(/_(.*?)_/g, '$1')
         .replace(/`([^`]+)`/g, '$1')
         .replace(/~~(.*?)~~/g, '$1')
         .trim()

      // Header bar
      pdf.setFillColor(249, 115, 22)
      pdf.rect(0, 0, pageW, 36, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('AxomPrep \u2014 Coach Response', margin, 24)
      pdf.setTextColor(40, 40, 40)

      const addPage = () => { pdf.addPage(); y = margin }
      const checkY = (needed: number) => { if (y + needed > pageH - margin) addPage() }

      // Pre-process: group table rows into blocks
      const rawLines = content.split('\n')
      type Block =
        | { type: 'line'; text: string }
        | { type: 'table'; rows: string[][] }

      const blocks: Block[] = []
      let i = 0
      while (i < rawLines.length) {
        const raw = rawLines[i]
        // Detect table row: starts and ends with |
        if (/^\s*\|/.test(raw)) {
          const tableRows: string[][] = []
          while (i < rawLines.length && /^\s*\|/.test(rawLines[i])) {
            const row = rawLines[i]
            // Skip separator rows like |---|---|
            if (/^\s*\|[\s|:-]+\|/.test(row) && !/[a-zA-Z0-9]/.test(row)) {
              i++; continue
            }
            const cells = row
              .replace(/^\s*\|/, '')
              .replace(/\|\s*$/, '')
              .split('|')
              .map(c => strip(c))
            tableRows.push(cells)
            i++
          }
          if (tableRows.length > 0) blocks.push({ type: 'table', rows: tableRows })
          continue
        }
        blocks.push({ type: 'line', text: raw })
        i++
      }

      // Render blocks
      for (const block of blocks) {
        if (block.type === 'table') {
          const rows = block.rows
          if (rows.length === 0) continue
          const cols = rows[0].length
          const colW = maxW / cols
          const rowH = 20
          checkY(rows.length * rowH + 8)

          rows.forEach((row, ri) => {
            // Header row: orange bg, white text
            if (ri === 0) {
              pdf.setFillColor(249, 115, 22)
              pdf.rect(margin, y - 13, maxW, rowH, 'F')
              pdf.setTextColor(255, 255, 255)
              pdf.setFont('helvetica', 'bold')
              pdf.setFontSize(9)
            } else {
              // Alternating rows
              if (ri % 2 === 0) pdf.setFillColor(255, 247, 237) // orange-50
              else pdf.setFillColor(255, 255, 255)
              pdf.rect(margin, y - 13, maxW, rowH, 'F')
              pdf.setTextColor(50, 50, 50)
              pdf.setFont('helvetica', 'normal')
              pdf.setFontSize(9)
            }
            // Cell borders
            pdf.setDrawColor(230, 180, 140)
            pdf.setLineWidth(0.5)
            row.forEach((cell, ci) => {
              const x = margin + ci * colW
              pdf.rect(x, y - 13, colW, rowH, 'S')
              pdf.text(cell, x + 5, y, { maxWidth: colW - 10 })
            })
            y += rowH
          })
          y += 8
          continue
        }

        // It's a line block
        const raw = block.text
        const line = raw.trimEnd()

        // Blank line
        if (line.trim() === '') { y += 5; continue }

        // Horizontal rule ---
        if (/^[-*_]{3,}$/.test(line.trim())) {
          checkY(12)
          pdf.setDrawColor(249, 115, 22)
          pdf.setLineWidth(0.75)
          pdf.line(margin, y - 4, pageW - margin, y - 4)
          y += 10
          continue
        }

        // H1
        if (/^# /.test(line)) {
          checkY(28)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(20, 20, 20)
          const w = pdf.splitTextToSize(strip(line.replace(/^# /, '')), maxW)
          pdf.text(w, margin, y); y += w.length * 20 + 4
          pdf.setDrawColor(249, 115, 22); pdf.setLineWidth(1.5)
          pdf.line(margin, y, pageW - margin, y); y += 10
          continue
        }
        // H2
        if (/^## /.test(line)) {
          checkY(22)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20)
          const w = pdf.splitTextToSize(strip(line.replace(/^## /, '')), maxW)
          pdf.text(w, margin, y); y += w.length * 17 + 6
          continue
        }
        // H3
        if (/^### /.test(line)) {
          checkY(18)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(80, 80, 80)
          const w = pdf.splitTextToSize(strip(line.replace(/^### /, '')), maxW)
          pdf.text(w, margin, y); y += w.length * 15 + 4
          continue
        }
        // H4
        if (/^#### /.test(line)) {
          checkY(16)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(100, 100, 100)
          const w = pdf.splitTextToSize(strip(line.replace(/^#### /, '')), maxW)
          pdf.text(w, margin, y); y += w.length * 14 + 2
          continue
        }
        // Sub-bullet (indented * or -)
        if (/^ {2,}[*-] /.test(line)) {
          checkY(13)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(80, 80, 80)
          pdf.text('\u25e6', margin + 20, y)
          const w = pdf.splitTextToSize(strip(line.replace(/^ {2,}[*-] /, '')), maxW - 30)
          pdf.text(w, margin + 30, y); y += w.length * 13
          continue
        }
        // Bullet
        if (/^[-*\u2022] /.test(line)) {
          checkY(14)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(60, 60, 60)
          pdf.text('\u2022', margin + 4, y)
          const w = pdf.splitTextToSize(strip(line.replace(/^[-*\u2022] /, '')), maxW - 14)
          pdf.text(w, margin + 14, y); y += w.length * 13 + 2
          continue
        }
        // Numbered list
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1] ?? ''
          checkY(14)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(60, 60, 60)
          pdf.text(`${num}.`, margin + 2, y)
          const w = pdf.splitTextToSize(strip(line.replace(/^\d+\. /, '')), maxW - 16)
          pdf.text(w, margin + 16, y); y += w.length * 13 + 2
          continue
        }
        // Regular paragraph
        checkY(14)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(60, 60, 60)
        const w = pdf.splitTextToSize(strip(line), maxW)
        pdf.text(w, margin, y); y += w.length * 13 + 2
      }

      // Footer
      const total = (pdf.internal as any).getNumberOfPages()
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p)
        pdf.setFontSize(8); pdf.setTextColor(180, 180, 180)
        pdf.text(`Generated by AxomPrep \u2022 Page ${p} of ${total}`, margin, pageH - 20)
      }

      pdf.save(`AxomPrep-Lesson-${Date.now()}.pdf`)
    } catch (err) { console.error('PDF failed:', err) }
    setIsDownloading(false)
  }


  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500/80 hover:text-orange-600 transition-all group px-2.5 py-1.5 rounded-xl hover:bg-orange-50/50 disabled:opacity-50"
    >
      {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />}
      <span>{isDownloading ? 'Generating...' : 'PDF'}</span>
    </button>
  )
}


// ── Generate Infographic Button ─────────────────────────────────────────
function GenerateImageButton({ content, topic }: { content: string, topic: string }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, topic }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate image')
        return
      }

      // Auto-download the image
      const link = document.createElement('a')
      link.href = `data:${data.mimeType};base64,${data.image}`
      link.download = `AxomPrep-Infographic-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError('Something went wrong. Try again.')
    }
    setIsGenerating(false)
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-500/80 hover:text-purple-600 transition-all group px-2.5 py-1.5 rounded-xl hover:bg-purple-50/50 disabled:opacity-50"
      >
        {isGenerating
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <ImageIcon className="w-3 h-3 transition-transform group-hover:scale-110" />}
        <span>{isGenerating ? 'Creating...' : 'Infographic'}</span>
      </button>
      {error && <p className="text-[9px] text-red-400 font-medium mt-0.5 pr-1">{error}</p>}
    </div>
  )
}


function addWavHeader(pcmData: ArrayBuffer, sampleRate: number) {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  view.setUint32(0, 0x52494646, false)
  view.setUint32(4, 36 + pcmData.byteLength, true)
  view.setUint32(8, 0x57415645, false)
  view.setUint32(12, 0x666d7420, false)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  view.setUint32(36, 0x64617461, false)
  view.setUint32(40, pcmData.byteLength, true)
  const combined = new Uint8Array(header.byteLength + pcmData.byteLength)
  combined.set(new Uint8Array(header), 0)
  combined.set(new Uint8Array(pcmData), header.byteLength)
  return combined.buffer
}

export default function CoachChatClient({
  coach,
  initialMessages,
  userLanguage,
  totalMessageCount,
  initialCredits
}: {
  coach: any
  initialMessages: Message[]
  userLanguage: string
  totalMessageCount: number
  initialCredits: number
}) {
  const MAX_MESSAGES = 50 // Chat limit
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Credits
  const [credits, setCredits] = useState(initialCredits)
  const [showNoCreditsDialog, setShowNoCreditsDialog] = useState(false)

  // Pagination states
  const [hasMore, setHasMore] = useState(initialMessages.length < totalMessageCount)
  const [loadingMore, setLoadingMore] = useState(false)
  const [chatLimitReached, setChatLimitReached] = useState(totalMessageCount >= 50)

  // Audio export states
  const [audioMode, setAudioMode] = useState<'story' | 'podcast'>('story')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Quiz states
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]) // Stores selected index for each question
  const [isQuizFinished, setIsQuizFinished] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isSavingQuiz, setIsSavingQuiz] = useState(false)

  const generateQuiz = async () => {
    if (isGeneratingQuiz) return
    setIsGeneratingQuiz(true)
    try {
      const { toast } = await import('sonner')
      const res = await fetch('/api/coach-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: coach.id })
      })
      const data = await res.json()
      if (data.questions && Array.isArray(data.questions)) {
        setQuizQuestions(data.questions)
        setCurrentQuizIndex(0)
        setQuizAnswers([])
        setQuizScore(0)
        setIsQuizFinished(false)
        setIsQuizOpen(true)
      } else {
        throw new Error(data.error || 'Failed to generate quiz')
      }
    } catch (err: any) {
      console.error("Quiz generation failed:", err)
      const { toast } = await import('sonner')
      toast.error(err.message || "Failed to generate quiz")
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleQuizAnswer = (optionIndex: number) => {
    if (showExplanation) return
    
    const currentQ = quizQuestions[currentQuizIndex]
    const updatedAnswers = [...quizAnswers]
    updatedAnswers[currentQuizIndex] = optionIndex
    setQuizAnswers(updatedAnswers)
    
    if (optionIndex === currentQ.correct_answer) {
      setQuizScore(prev => prev + 1)
    }
    
    setShowExplanation(true)
    
    // Auto advance after 1.5 seconds
    setTimeout(() => {
      if (currentQuizIndex < quizQuestions.length - 1) {
        setCurrentQuizIndex(prev => prev + 1)
        setShowExplanation(false)
      } else {
        finishQuiz(updatedAnswers)
      }
    }, 1500)
  }

  const finishQuiz = async (finalAnswers: number[]) => {
    setIsQuizFinished(true)
    setShowExplanation(false)
    setIsSavingQuiz(true)
    
    try {
      // Calculate final score
      let score = 0
      quizQuestions.forEach((q, idx) => {
        if (finalAnswers[idx] === q.correct_answer) score++
      })
      
      const { saveQuizResult } = await import('@/lib/actions')
      await saveQuizResult({
        coach_id: coach.id,
        topic: coach.topic,
        questions: quizQuestions,
        user_answers: finalAnswers,
        score: score,
        total_questions: quizQuestions.length
      })
    } catch (err) {
      console.error("Failed to save quiz result:", err)
    } finally {
      setIsSavingQuiz(false)
    }
  }

  // ======== REAL-TIME VOICE STATE ========
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceTranscripts, setVoiceTranscripts] = useState<{ text: string; isUser: boolean }[]>([])

  // Gemini Live session + audio refs
  const sessionRef = useRef<any>(null)
  const inputAudioCtxRef = useRef<AudioContext | null>(null)  // 16kHz mic input
  const outputAudioCtxRef = useRef<AudioContext | null>(null) // 24kHz AI output
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Int16Array[]>([])
  const isPlayingRef = useRef(false)
  const nextPlayTimeRef = useRef(0)       // wall-clock time for next buffer
  const aiTurnTextRef = useRef('')        // accumulate AI speech text
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])
  // Live status label (not transcript - just what the AI is saying right now)
  const [voiceStatusText, setVoiceStatusText] = useState('')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length >= MAX_MESSAGES) setChatLimitReached(true)
  }, [messages])

  useEffect(() => {
    if (credits <= 0) setShowNoCreditsDialog(true)
  }, [credits])

  // ── TRUE GAPLESS audio scheduling (pre-schedule buffers into the future) ──
  const enqueueAudio = useCallback((pcm: Int16Array) => {
    const ctx = outputAudioCtxRef.current
    if (!ctx) return

    // Resume if browser suspended it
    if (ctx.state === 'suspended') ctx.resume()

    const buffer = ctx.createBuffer(1, pcm.length, 24000)
    const ch = buffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) {
      ch[i] = pcm[i] / 32768.0
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)

    // Schedule at the correct wall-clock time so there is ZERO gap
    const now = ctx.currentTime
    if (nextPlayTimeRef.current < now + 0.01) {
      // We've fallen behind (or just starting) — schedule with a tiny 50ms buffer
      nextPlayTimeRef.current = now + 0.05
    }
    src.start(nextPlayTimeRef.current)
    nextPlayTimeRef.current += buffer.duration   // advance pointer exactly

    scheduledSourcesRef.current.push(src)
    src.onended = () => {
      scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== src)
    }
  }, [])

  // ── Stop / cleanup ────────────────────────────────────────────────────────
  const stopVoiceSession = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    processorRef.current?.disconnect()
    processorRef.current = null
    inputAudioCtxRef.current?.close().catch(() => {})
    inputAudioCtxRef.current = null
    
    // Cancel all pre-scheduled audio immediately
    scheduledSourcesRef.current.forEach(src => { try { src.stop(); } catch {} })
    scheduledSourcesRef.current = []
    
    outputAudioCtxRef.current?.close().catch(() => {})
    outputAudioCtxRef.current = null
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
    nextPlayTimeRef.current = 0
    aiTurnTextRef.current = ''
    setVoiceStatusText('')
    setIsVoiceActive(false)
    setIsVoiceConnecting(false)
  }, [])

  useEffect(() => () => stopVoiceSession(), [stopVoiceSession])

  // ── Start mic streaming ───────────────────────────────────────────────────
  const startMicStream = useCallback((stream: MediaStream, inputCtx: AudioContext) => {
    if (inputCtx.state === 'suspended') inputCtx.resume()
    const source = inputCtx.createMediaStreamSource(stream)
    const processor = inputCtx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (!sessionRef.current) return
      const float32 = e.inputBuffer.getChannelData(0)
      const pcm16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      // Safe base64 conversion (avoids stack overflow with large buffers from spread operator)
      try {
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        sessionRef.current.sendRealtimeInput({
          media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' }
        })
      } catch {}
    }

    source.connect(processor)
    
    // Create a silent gain node to keep the processor alive without feeding mic audio to speakers (Double Voice fix)
    const silentGain = inputCtx.createGain()
    silentGain.gain.value = 0
    processor.connect(silentGain)
    silentGain.connect(inputCtx.destination)
  }, [])


  // ─── Start live voice session (Standard Live SDK Pattern) ────────────────
  const startVoiceSession = async () => {
    if (isVoiceConnecting || isVoiceActive) return
    if (credits <= 0) { setShowNoCreditsDialog(true); return }
    
    // 1. Ensure any previous session is cleaned up first
    stopVoiceSession();
    
    setIsVoiceConnecting(true)
    setVoiceError(null)
    setVoiceTranscripts([])
    setVoiceStatusText('Connecting...')
    aiTurnTextRef.current = ''

    // 2. Get ephemeral token (server deducts 1 credit atomically)
    let ephemeralToken: string;
    try {
      const res = await fetch('/api/live-session/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          coachName: coach.name, 
          topic: coach.topic, 
          language: userLanguage 
        }),
      });
      const data = await res.json();

      // Handle no-credits case specifically
      if (data.errorCode === 'NO_CREDITS') {
        setCredits(data.credits ?? 0);
        setIsVoiceConnecting(false);
        setVoiceStatusText('');
        setShowNoCreditsDialog(true);
        return;
      }

      if (!res.ok || !data.token) throw new Error(data.error || 'Failed to authenticate.');
      ephemeralToken = data.token;

      // Update credit display immediately after deduction
      if (typeof data.credits === 'number') {
        setCredits(data.credits);
      }
    } catch (err: any) {
      setVoiceError(err.message || 'Connection failed.');
      setIsVoiceConnecting(false);
      return;
    }

    // 2. Request microphone
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } 
      })
      streamRef.current = stream
    } catch {
      setVoiceError('Microphone access denied.')
      setIsVoiceConnecting(false)
      return
    }

    // 3. Setup Audio
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    inputAudioCtxRef.current = inputCtx
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
    outputAudioCtxRef.current = outputCtx

    // 4. Connect to Gemini Live
    try {
      const ai = new GoogleGenAI({ 
        apiKey: ephemeralToken,
        //@ts-ignore
        httpOptions: { apiVersion: 'v1alpha' }
      });

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { 
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsVoiceConnecting(false)
            setIsVoiceActive(true)
            setVoiceTranscripts([{ text: "Connected! You can start speaking.", isUser: false }])
            
            // Ensure audio contexts are running
            if (inputCtx.state === 'suspended') inputCtx.resume();
            if (outputCtx.state === 'suspended') outputCtx.resume();
            setVoiceStatusText('Listening...')
            startMicStream(stream, inputCtx)
          },
          onmessage: (msg: any) => {
            // ── Barge-in: AI interrupted ──────────────────────────────────
            if (msg.serverContent?.interrupted) {
              // Cancel all pre-scheduled future audio
              scheduledSourcesRef.current.forEach(src => { try { src.stop(); } catch {} })
              scheduledSourcesRef.current = []
              nextPlayTimeRef.current = 0
              aiTurnTextRef.current = ''
              setVoiceStatusText('Listening...')
              return
            }

            // ── Decode and schedule every audio part from this message ────
            const parts = msg.serverContent?.modelTurn?.parts || [];
            let gotAudio = false;
            for (const part of parts) {
              const b64 = part.inlineData?.data;
              if (b64) {
                const binaryString = atob(b64);
                const len = binaryString.length;
                const view = new DataView(new ArrayBuffer(len));
                for (let j = 0; j < len; j++) {
                  (new Uint8Array(view.buffer))[j] = binaryString.charCodeAt(j);
                }
                const pcm = new Int16Array(len / 2);
                for (let j = 0; j < pcm.length; j++) {
                  pcm[j] = view.getInt16(j * 2, true);
                }
                enqueueAudio(pcm);  // schedule directly — no queue polling needed
                gotAudio = true;
              }
              if (part.text) aiTurnTextRef.current += part.text;
            }

            // Show what the AI is saying
            if (gotAudio) setVoiceStatusText('Speaking...')

            // outputTranscription is the definitive speech text
            const outTx = msg.serverContent?.outputTranscription?.text;
            if (outTx) {
              aiTurnTextRef.current = outTx; // use transcription as source of truth
            }

            if (msg.serverContent?.turnComplete) {
              aiTurnTextRef.current = '';
              setVoiceStatusText('Listening...')
            }
          },
          onerror: (err: any) => {
            console.error('Session error:', err);
            setVoiceError('Connection error. Please try again.');
            stopVoiceSession();
          },
          onclose: () => {
             stopVoiceSession();
          }
        }
      });
      sessionRef.current = session;
    } catch (err: any) {
      console.error('Connect failed:', err);
      setVoiceError('Failed to establish voice connection.');
      stopVoiceSession();
    }
  }

  // ======== LOAD OLDER MESSAGES ========
  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)

    const oldestMessage = messages[0]
    const cursor = oldestMessage.created_at
    if (!cursor) { setLoadingMore(false); return }

    try {
      const res = await fetch(`/api/coach-messages?coachId=${coach.id}&before=${encodeURIComponent(cursor)}`)
      const data = await res.json()

      if (data.messages && data.messages.length > 0) {
        const container = chatContainerRef.current
        const prevHeight = container?.scrollHeight || 0
        setMessages(prev => [...data.messages, ...prev])
        setHasMore(data.hasMore)
        requestAnimationFrame(() => {
          if (container) {
            const newHeight = container.scrollHeight
            container.scrollTop = newHeight - prevHeight
          }
        })
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load older messages:', err)
    }
    setLoadingMore(false)
  }

  // ======== TEXT CHAT ========
  const sendMessage = async () => {
    if (!input.trim() || loading || credits <= 0 || chatLimitReached) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: coach.id, message: userMsg.content })
      })
      const data = await res.json()

      if (data.errorCode === 'NO_CREDITS') {
        setCredits(0)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ You\'ve run out of credits! Please upgrade your plan to continue chatting.'
        }])
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        if (typeof data.credits === 'number') setCredits(data.credits)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  // ======== AUDIO EXPORT ========
  const generateAudio = async () => {
    const allContent = messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n')
    if (!allContent) return
    setIsGeneratingAudio(true)
    try {
      const { toast } = await import('sonner')
      const res = await fetch('/api/coach-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allContent, mode: audioMode, language: userLanguage })
      })
      const data = await res.json()
      
      if (!res.ok || !data.audio) {
        throw new Error(data.error || 'Failed to generate audio. The content might be too long or the server timed out.')
      }

      const binaryString = window.atob(data.audio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
      const wavBuffer = addWavHeader(bytes.buffer, 24000)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.load()
        }
      }, 100)
      
      toast.success(`${audioMode === 'story' ? 'Story' : 'Podcast'} generated successfully!`)
    } catch (err: any) { 
      console.error('Audio generation failed:', err)
      const { toast } = await import('sonner')
      toast.error(err.message || 'Audio generation failed. Please try again.')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const langLabel: Record<string, string> = {
    assamese: 'অসমীয়া', english: 'English', hindi: 'हिन्दी', bengali: 'বাংলা', bodo: 'बड़ो'
  }

  return (
    <div className="h-screen bg-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-orange-100/30 via-blue-50/10 to-transparent blur-[120px] -z-0 rounded-full pointer-events-none" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-amber-50/30 blur-[150px] rounded-full -z-0 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-xl z-20 shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center hover:bg-orange-50 hover:border-orange-200 transition-all group">
              <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black leading-tight">{coach.name}</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{coach.topic}</span>
                <span className="text-zinc-200">·</span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500 border border-orange-100">
                  {langLabel[userLanguage] || userLanguage}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Credits badge */}
            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
              credits <= 0
                ? 'bg-red-50 border-red-100 text-red-500'
                : credits <= 5
                ? 'bg-amber-50 border-amber-100 text-amber-600'
                : 'bg-zinc-50 border-zinc-100 text-zinc-500'
            }`}>
              <Zap className="w-2.5 h-2.5" />{credits} credits
            </span>
            <button
              onClick={() => setIsAudioPanelOpen(!isAudioPanelOpen)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                isAudioPanelOpen
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'border-zinc-100 text-zinc-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Audio
            </button>
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative z-10 min-h-0">
        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${isAudioPanelOpen ? 'lg:mr-80' : ''}`}>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-50 border border-zinc-100 text-xs font-bold text-zinc-400 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Loading...</>
                  ) : (
                    <><ChevronUp className="w-3 h-3" /> Load earlier messages</>
                  )}
                </button>
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-lg shadow-orange-100/50">
                    <Bot className="w-10 h-10 text-orange-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mb-1">Ask me anything about</h2>
                <p className="text-lg sm:text-xl font-serif italic text-orange-500 mb-8">{coach.topic}</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {[
                    `What is ${coach.topic}?`,
                    `Explain the basics`,
                    `Key concepts`,
                    `Why is it important?`
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-4 py-2 rounded-full border border-zinc-100 text-sm font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 sm:gap-3 max-w-5xl mx-auto w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-orange-500/20">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl rounded-tr-md px-4 sm:px-5 py-3 shadow-lg shadow-orange-500/15'
                  : 'bg-white rounded-2xl rounded-tl-md px-4 sm:px-5 py-4 border border-zinc-100 shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <>
                      <div id={`msg-${i}`} className="prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-zinc-600 prose-p:leading-relaxed prose-a:text-orange-500 prose-strong:text-zinc-800 prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="mt-2 flex justify-end items-center gap-1">
                        <CopyButton text={msg.content} />
                        <span className="w-1 h-1 rounded-full bg-zinc-200" />
                        <DownloadPDFButton messageId={i.toString()} content={msg.content} />
                        <span className="w-1 h-1 rounded-full bg-zinc-200" />
                        <GenerateImageButton content={msg.content} topic={coach.topic} />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 mt-1">
                    <UserIcon className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3 max-w-5xl mx-auto w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 border border-zinc-100 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-medium">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chat limit reached */}
            {chatLimitReached && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
                    <MessageSquarePlus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-sm font-black mb-1">This chat is getting long!</h3>
                  <p className="text-xs text-zinc-400 font-medium mb-4">For the best experience, start a fresh conversation with your coach.</p>
                  <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <MessageSquarePlus className="w-4 h-4" /> Start New Chat
                  </a>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input - always pinned at bottom */}
          <div className="border-t border-zinc-100 p-3 sm:p-4 bg-white/80 backdrop-blur-xl shrink-0">
            {!chatLimitReached && credits > 0 && !isQuizOpen && (
              <div className="max-w-5xl mx-auto mb-3 flex justify-start">
                <button
                  onClick={generateQuiz}
                  disabled={isGeneratingQuiz}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-[11px] font-black text-orange-600 hover:bg-orange-100 hover:border-orange-200 transition-all shadow-sm shadow-orange-500/5 group disabled:opacity-50"
                >
                  {isGeneratingQuiz ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Gamepad2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  )}
                  {isGeneratingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                </button>
              </div>
            )}
            {chatLimitReached ? (
              <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 py-1">
                <p className="text-xs text-zinc-400 font-medium">Chat limit reached.</p>
                <a href="/dashboard" className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">
                  Start a new chat →
                </a>
              </div>
            ) : credits <= 0 ? (
              <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 py-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-red-400" />
                  <p className="text-xs text-red-500 font-bold">No credits left!</p>
                </div>
                <a href="/profile" className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors underline underline-offset-2">
                  Upgrade plan →
                </a>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto flex items-center gap-2">
                <button
                  onClick={() => setIsAudioPanelOpen(!isAudioPanelOpen)}
                  className="sm:hidden w-11 h-11 rounded-xl border border-zinc-100 flex items-center justify-center hover:bg-orange-50 transition-all shrink-0"
                >
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                </button>
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={`Ask about ${coach.topic}...`}
                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-zinc-50 border border-zinc-100 focus:border-orange-300 outline-none transition-all font-medium text-sm placeholder:text-zinc-300 focus:ring-4 focus:ring-orange-500/10 focus:bg-white"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Panel */}
        {isAudioPanelOpen && (
          <>
            <div className="hidden lg:block w-80 border-l border-zinc-100 p-6 fixed right-0 top-[57px] bottom-0 bg-white/95 backdrop-blur-xl overflow-y-auto">
              <AudioPanel
                audioMode={audioMode} setAudioMode={setAudioMode}
                isGeneratingAudio={isGeneratingAudio} generateAudio={generateAudio}
                audioUrl={audioUrl} setAudioUrl={setAudioUrl}
                isPlaying={isPlaying} setIsPlaying={setIsPlaying}
                togglePlayback={togglePlayback} audioRef={audioRef}
                coachName={coach.name}
                hasMessages={messages.filter(m => m.role === 'assistant').length > 0}
                onClose={() => setIsAudioPanelOpen(false)}
              />
            </div>
            <div className="lg:hidden fixed inset-0 z-40">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsAudioPanelOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-zinc-100 p-6 max-h-[70vh] overflow-y-auto shadow-2xl">
                <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-5" />
                <AudioPanel
                  audioMode={audioMode} setAudioMode={setAudioMode}
                  isGeneratingAudio={isGeneratingAudio} generateAudio={generateAudio}
                  audioUrl={audioUrl} setAudioUrl={setAudioUrl}
                  isPlaying={isPlaying} setIsPlaying={setIsPlaying}
                  togglePlayback={togglePlayback} audioRef={audioRef}
                  coachName={coach.name}
                  hasMessages={messages.filter(m => m.role === 'assistant').length > 0}
                  onClose={() => setIsAudioPanelOpen(false)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ======== REAL-TIME VOICE MODAL ======== */}
      {isVoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { stopVoiceSession(); setIsVoiceOpen(false) }} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-3xl shadow-2xl border-t sm:border border-zinc-100 p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="sm:hidden w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4" />

            {/* Top bar */}
            <div className="w-full flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center gap-2">
                {isVoiceActive && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {isVoiceActive ? 'Live Session' : 'Voice Coach'}
                </span>
              </div>
              <button onClick={() => { stopVoiceSession(); setIsVoiceOpen(false) }} className="p-2 hover:bg-zinc-50 rounded-full">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Mic Orb */}
            <div className="relative mb-8 sm:mb-10">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
                isVoiceActive
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 scale-110 shadow-2xl shadow-orange-500/30'
                  : isVoiceConnecting
                    ? 'bg-gradient-to-br from-orange-100 to-amber-100'
                    : 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-100'
              }`}>
                {isVoiceConnecting ? (
                  <Loader2 className="animate-spin text-orange-400" size={36} />
                ) : isVoiceActive ? (
                  <Mic size={36} className="text-white animate-pulse" />
                ) : (
                  <Mic size={36} className="text-orange-300" />
                )}
              </div>
              {isVoiceActive && (
                <>
                  <div className="absolute -inset-3 border-2 border-orange-300/30 rounded-full animate-ping" />
                  <div className="absolute -inset-6 border border-orange-200/20 rounded-full animate-ping" style={{ animationDelay: '500ms' }} />
                </>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black mb-1">
              {isVoiceActive ? 'Your tutor is listening...' : isVoiceConnecting ? 'Connecting...' : `Talk to ${coach.name}`}
            </h3>
            <p className="text-zinc-400 text-xs font-medium mb-5 sm:mb-6 max-w-xs">
              {isVoiceActive
                ? `Speak naturally about ${coach.topic}. Your tutor responds in real-time.`
                : isVoiceConnecting
                  ? `Setting up your ${coach.topic} voice coach...`
                  : `Start a real-time voice conversation about ${coach.topic}.`
              }
            </p>

            {/* Status text — clean single line, no chat transcript */}
            <div className="w-full bg-zinc-50 rounded-xl sm:rounded-2xl px-5 py-4 mb-5 sm:mb-6 min-h-[56px] flex items-center justify-center border border-zinc-100">
              <p className="text-sm font-medium text-zinc-500 text-center leading-relaxed">
                {voiceStatusText || (isVoiceActive ? 'Listening...' : isVoiceConnecting ? 'Connecting...' : `Ready to talk about ${coach.topic}`)}
              </p>
            </div>

            {voiceError && (
              <p className="text-red-500 text-xs font-medium mb-4">{voiceError}</p>
            )}

            {!isVoiceActive ? (
              <button
                onClick={startVoiceSession}
                disabled={isVoiceConnecting}
                className="w-full py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm hover:shadow-xl hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVoiceConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                {isVoiceConnecting ? 'Connecting...' : 'Start Live Session'}
              </button>
            ) : (
              <button
                onClick={() => { stopVoiceSession() }}
                className="w-full py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:shadow-xl hover:shadow-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <MicOff className="w-5 h-5" /> End Session
              </button>
            )}
          </div>
        </div>
      )}
      {/* No Credits Dialog */}
      <AlertDialog open={showNoCreditsDialog} onOpenChange={setShowNoCreditsDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-50">
              <Zap className="w-8 h-8 text-red-500" />
            </AlertDialogMedia>
            <div>
              <AlertDialogTitle className="text-base font-black">You&apos;re out of credits!</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                You&apos;ve used all your credits. Upgrade your plan to continue chatting with your coaches and unlock unlimited messages.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNoCreditsDialog(false)}>
              Maybe later
            </AlertDialogCancel>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
              onClick={() => setShowNoCreditsDialog(false)}
            >
              <Zap className="w-4 h-4" /> View Pricing
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======== QUIZ MODAL ======== */}
      {isQuizOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-zinc-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">Knowledge Quiz</h3>
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{coach.topic}</p>
                </div>
              </div>
              {!isQuizFinished && (
                <div className="bg-zinc-100 px-3 py-1.5 rounded-xl text-[11px] font-black text-zinc-500 flex items-center gap-1.5">
                  <span className="text-orange-500">{currentQuizIndex + 1}</span>
                  <span className="text-zinc-300">/</span>
                  <span>{quizQuestions.length}</span>
                </div>
              )}
              <button 
                onClick={() => setIsQuizOpen(false)} 
                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
              {!isQuizFinished ? (
                <div className="space-y-8">
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                      style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>

                  {/* Question */}
                  <div className="space-y-4">
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-800 leading-tight">
                      {quizQuestions[currentQuizIndex]?.question}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className="grid gap-3 sm:gap-4">
                    {quizQuestions[currentQuizIndex]?.options.map((option: string, idx: number) => {
                      const isSelected = quizAnswers[currentQuizIndex] === idx
                      const isCorrect = idx === quizQuestions[currentQuizIndex].correct_answer
                      
                      let variantStyles = 'border-zinc-100 bg-zinc-50 hover:border-orange-200 hover:bg-orange-50'
                      if (showExplanation) {
                        if (isCorrect) variantStyles = 'border-green-200 bg-green-50 text-green-700'
                        else if (isSelected) variantStyles = 'border-red-200 bg-red-50 text-red-700'
                        else variantStyles = 'border-zinc-100 bg-zinc-50 opacity-40'
                      } else if (isSelected) {
                        variantStyles = 'border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-500/10'
                      }

                      return (
                        <button
                          key={idx}
                          disabled={showExplanation}
                          onClick={() => handleQuizAnswer(idx)}
                          className={`group w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all text-left ${variantStyles}`}
                        >
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                             showExplanation && isCorrect 
                               ? 'bg-green-500 text-white' 
                               : showExplanation && isSelected && !isCorrect
                                 ? 'bg-red-500 text-white'
                                 : isSelected 
                                   ? 'bg-orange-500 text-white' 
                                   : 'bg-white text-zinc-400 group-hover:bg-orange-100 group-hover:text-orange-500 shadow-sm border border-zinc-100'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="flex-1 font-bold text-sm sm:text-base">{option}</span>
                          {showExplanation && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {showExplanation && isSelected && !isCorrect && <AlertCircle className="w-5 h-5 text-red-500" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="relative mb-8">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-2xl shadow-orange-500/30">
                      <Trophy size={60} />
                    </div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-zinc-100 animate-bounce">
                      <Sparkles className="text-orange-500" size={24} />
                    </div>
                  </div>

                  <h2 className="text-3xl font-black mb-2">Quiz Complete!</h2>
                  <p className="text-zinc-500 font-medium mb-10">You've mastered some great concepts today.</p>

                  <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-8 sm:p-10 w-full mb-10">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mb-2">Your Final Score</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-6xl sm:text-7xl font-black text-orange-500">{quizScore}</span>
                        <span className="text-xl sm:text-2xl font-bold text-orange-200">/{quizQuestions.length}</span>
                      </div>
                      <div className="mt-6 w-full h-2 bg-white rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                          style={{ width: `${(quizScore / quizQuestions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsQuizOpen(false)}
                      className="flex-1 py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/20"
                    >
                      Close Quiz
                    </button>
                    <button
                      onClick={generateQuiz}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/20"
                    >
                      <BrainCircuit size={18} /> Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Status */}
            {!isQuizFinished && (
              <div className="shrink-0 p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Correct Answers Reveal Instantly
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Auto-Saving to Profile
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// ======== Audio Panel Component ========
function AudioPanel({
  audioMode, setAudioMode, isGeneratingAudio, generateAudio,
  audioUrl, setAudioUrl, isPlaying, setIsPlaying, togglePlayback,
  audioRef, coachName, hasMessages, onClose
}: {
  audioMode: 'story' | 'podcast'
  setAudioMode: (m: 'story' | 'podcast') => void
  isGeneratingAudio: boolean
  generateAudio: () => void
  audioUrl: string | null
  setAudioUrl: (u: string | null) => void
  isPlaying: boolean
  setIsPlaying: (p: boolean) => void
  togglePlayback: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  coachName: string
  hasMessages: boolean
  onClose: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-50 rounded-lg flex items-center justify-center border border-orange-100">
            <Volume2 className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-black text-sm">Audio Export</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-zinc-50 rounded-lg">
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <p className="text-xs text-zinc-400 font-medium mb-3">
        Transform this conversation into an immersive audio experience.
      </p>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-5">
        <Download className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
          Audio is not saved. Please download it after generating — it will be lost when you leave this page.
        </p>
      </div>

      <div className="space-y-2 mb-5">
        <button
          onClick={() => setAudioMode('story')}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
            audioMode === 'story' ? 'border-orange-300 bg-orange-50/50' : 'border-zinc-100 hover:border-orange-200 hover:bg-orange-50/30'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${audioMode === 'story' ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-zinc-100'}`}>
            <BookOpen className={`w-4 h-4 ${audioMode === 'story' ? 'text-white' : 'text-zinc-400'}`} />
          </div>
          <div>
            <p className="text-xs font-bold">Storytelling</p>
            <p className="text-[10px] text-zinc-400">Single narrator</p>
          </div>
        </button>
        <button
          onClick={() => setAudioMode('podcast')}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
            audioMode === 'podcast' ? 'border-orange-300 bg-orange-50/50' : 'border-zinc-100 hover:border-orange-200 hover:bg-orange-50/30'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${audioMode === 'podcast' ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-zinc-100'}`}>
            <Mic2 className={`w-4 h-4 ${audioMode === 'podcast' ? 'text-white' : 'text-zinc-400'}`} />
          </div>
          <div>
            <p className="text-xs font-bold">Podcast</p>
            <p className="text-[10px] text-zinc-400">Tutor & Student dialogue</p>
          </div>
        </button>
      </div>

      {!audioUrl ? (
        <div className="space-y-3">
          <button
            onClick={generateAudio}
            disabled={isGeneratingAudio || !hasMessages}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
          >
            {isGeneratingAudio ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate {audioMode === 'story' ? 'Story' : 'Podcast'}
              </>
            )}
          </button>
          
          {isGeneratingAudio && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                As you requested longer audio (8-10 mins), generation will take a few moments. Please have patience while we craft your experience.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-100">
            <audio ref={audioRef} src={audioUrl || undefined} preload="auto" onEnded={() => setIsPlaying(false)} className="hidden" />
            <a 
              href={audioUrl} 
              download={`${coachName}-${audioMode}.wav`} 
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
            >
              <Download className="w-4 h-4" />
              Download {audioMode === 'story' ? 'Story' : 'Podcast'} Audio
            </a>
          </div>
          <button onClick={() => { setAudioUrl(null); setIsPlaying(false) }} className="w-full text-xs text-zinc-400 hover:text-orange-500 font-bold transition-colors">
            Regenerate
          </button>
        </div>
      )}
    </>
  )
}
