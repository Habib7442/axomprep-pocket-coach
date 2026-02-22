'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Send, Loader2, Mic, MicOff, Volume2, BookOpen,
  Mic2, Sparkles, Play, Pause, Download, X, Bot, User as UserIcon,
  ChevronUp, MessageSquarePlus, Zap, BrainCircuit, CheckCircle2, AlertCircle, Trophy
} from 'lucide-react'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogMedia
} from '@/components/ui/alert-dialog'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
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

  // Real-time voice states
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceTranscripts, setVoiceTranscripts] = useState<{ text: string; isUser: boolean }[]>([])

  // Real-time voice refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check chat limit when messages change
  useEffect(() => {
    if (messages.length >= MAX_MESSAGES) {
      setChatLimitReached(true)
    }
  }, [messages])

  // Show no-credits dialog when credits hit 0
  useEffect(() => {
    if (credits <= 0) {
      setShowNoCreditsDialog(true)
    }
  }, [credits])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => stopVoiceSession()
  }, [])

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
        // Preserve scroll position
        const container = chatContainerRef.current
        const prevHeight = container?.scrollHeight || 0

        setMessages(prev => [...data.messages, ...prev])
        setHasMore(data.hasMore)

        // Restore scroll position after prepending
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
      const res = await fetch('/api/coach-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allContent, mode: audioMode, language: userLanguage })
      })
      const data = await res.json()
      if (data.audio) {
        const binaryString = window.atob(data.audio)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
        const wavBuffer = addWavHeader(bytes.buffer, 24000)
        const blob = new Blob([wavBuffer], { type: 'audio/wav' })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        // Explicitly load the new source in the audio element
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = url
            audioRef.current.load()
          }
        }, 100)
      }
    } catch (err) { console.error('Audio generation failed:', err) }
    setIsGeneratingAudio(false)
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  // ======== VOICE SESSION (Request-Response) ========
  const startVoiceSession = async () => {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const actualMimeType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType })
        processVoiceAudio(audioBlob)
      }

      recorder.start()
      setIsVoiceActive(true)
      setVoiceTranscripts(prev => [...prev, { text: "Listening...", isUser: false }])
    } catch (err) {
      console.error('Mic access error:', err)
      setVoiceError('Microphone access denied.')
      // Ensure stream is stopped if it was acquired but recording failed to start
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }

  const stopVoiceSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
    setIsVoiceActive(false)
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
  }

  const processVoiceAudio = async (blob: Blob) => {
    setIsVoiceConnecting(true)
    try {
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = () => reject(new Error('Failed to read audio'))
      reader.readAsDataURL(blob)
    })
    
    const response = await fetch('/api/coach-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coachId: coach.id,
        audioBase64: base64Audio,
        mimeType: blob.type
      })
    })

    const data = await response.json()
    if (!response.ok) {
      if (data.errorCode === 'NO_CREDITS') {
        if (typeof data.credits === 'number') setCredits(data.credits)
        setShowNoCreditsDialog(true)
        throw new Error(data.error || "Out of credits")
      }
      throw new Error(data.error || "Failed to get response")
    }

    if (data.text) {
      if (typeof data.credits === 'number') setCredits(data.credits)
      if (data.userTranscript) {
        setVoiceTranscripts(prev => [...prev, { text: data.userTranscript, isUser: true }])
        setMessages(prev => [...prev, { role: 'user', content: data.userTranscript }])
      }
      setVoiceTranscripts(prev => [...prev, { text: data.text, isUser: false }])
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
    }
    
    if (data.audio) {
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`)
      currentAudioRef.current = audio
      audio.onended = () => { currentAudioRef.current = null }
      audio.play()
    }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Voice processing failed"
      setVoiceError(message)
    } finally {
      setIsVoiceConnecting(false)
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
                    <div className="prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-zinc-600 prose-p:leading-relaxed prose-a:text-orange-500 prose-strong:text-zinc-800 prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
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
                    <BrainCircuit className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
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

            {/* Live transcript */}
            {voiceTranscripts.length > 0 && (
              <div className="w-full bg-zinc-50 rounded-xl sm:rounded-2xl p-4 mb-5 sm:mb-6 min-h-[80px] max-h-[180px] overflow-y-auto flex flex-col gap-1.5 border border-zinc-100">
                {voiceTranscripts.map((t, i) => (
                  <div key={i} className={`text-xs font-medium px-3 py-1.5 rounded-lg max-w-[80%] ${
                    t.isUser
                      ? 'bg-gradient-to-r from-orange-100 to-amber-100 self-end text-right text-zinc-700'
                      : 'bg-white self-start text-left text-zinc-500 border border-zinc-100'
                  }`}>
                    {t.text}
                  </div>
                ))}
              </div>
            )}

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
        <button
          onClick={generateAudio}
          disabled={isGeneratingAudio || !hasMessages}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
        >
          {isGeneratingAudio ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate {audioMode === 'story' ? 'Story' : 'Podcast'}</>}
        </button>
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
