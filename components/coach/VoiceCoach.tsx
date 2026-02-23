"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleGenAI, Modality } from '@google/genai';

interface VoiceCoachProps {
  coachId: string;
  coachName: string;
  topic: string;
  language: string;
  onTranscription?: (text: string, role: 'user' | 'assistant') => void;
}

type SessionState = 'idle' | 'fetching-token' | 'connecting' | 'active' | 'error';

export const VoiceCoach: React.FC<VoiceCoachProps> = ({
  coachId,
  coachName,
  topic,
  language,
  onTranscription,
}) => {
  const [state, setState] = useState<SessionState>('idle');
  const [statusText, setStatusText] = useState('Tap to start live session');

  // Refs — never stored in state to avoid re-renders
  // Refs — never stored in state to avoid re-renders
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // Input context (16kHz)
  const outputContextRef = useRef<AudioContext | null>(null); // Output context (24kHz)
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  // ─── Audio output scheduler (gapless playback) ────────────────────────────
  const playNextInQueue = useCallback(() => {
    const ctx = outputContextRef.current;
    if (!ctx || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const buffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Schedule for gapless playback
    const now = ctx.currentTime
    let startAt = nextPlayTimeRef.current
    
    if (startAt < now) {
      startAt = now + 0.25 // 250ms safety buffer
    } else if (startAt > now + 0.8) {
      startAt = now + 0.25
    }

    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      } else {
        isPlayingRef.current = false;
      }
    };
  }, []);

  // ─── Stop everything ──────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    // Close AudioContexts
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close().catch(() => {});
      outputContextRef.current = null;
    }
    // Close Gemini Live session
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setState('idle');
    setStatusText('Tap to start live session');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopSession(), [stopSession]);

  // ─── Start session ────────────────────────────────────────────────────────
  const startSession = async () => {
    if (state !== 'idle' && state !== 'error') return;

    // 1. Fetch ephemeral token from our server (GEMINI_API_KEY stays server-side)
    setState('fetching-token');
    setStatusText('Securing connection...');

    let ephemeralToken: string;
    try {
      const res = await fetch('/api/live-session/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachName, topic, language }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Could not get session token.');
      }
      ephemeralToken = data.token;
    } catch (err: any) {
      toast.error(err.message || 'Failed to start voice session');
      setState('error');
      setStatusText('Connection failed — tap to retry');
      return;
    }

    // 2. Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
    } catch {
      toast.error('Microphone access denied. Please allow mic access and try again.');
      setState('error');
      setStatusText('Mic denied — tap to retry');
      return;
    }

    // 3. Create AudioContext for both input capture and output playback
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    // 4. Connect to Gemini Live using ephemeral token (NOT the real API key)
    setState('connecting');
    setStatusText('Connecting...');

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
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setState('active');
            setStatusText('Listening...');
            // Start output AudioContext at 24kHz for playback
            const outCtx = new AudioContext({ sampleRate: 24000 });
            if (outCtx.state === 'suspended') outCtx.resume();
            outputContextRef.current = outCtx;
            void startMicCapture(stream, session, audioContext);
          },
          onmessage: (msg: any) => {
            // Audio response from Gemini
            const b64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (b64) {
              const raw = atob(b64);
              const pcm = new Int16Array(raw.length / 2);
              for (let i = 0; i < pcm.length; i++) {
                const lo = raw.charCodeAt(i * 2);
                const hi = raw.charCodeAt(i * 2 + 1);
                pcm[i] = (hi << 8) | lo;
              }
              // Buffer into a separate 24kHz context for playback
              audioQueueRef.current.push(pcm);
              if (!isPlayingRef.current) {
                playNextInQueue();
              }
            }

            // Text transcript from model
            const textPart = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
            if (textPart?.text) {
              onTranscription?.(textPart.text, 'assistant');
            }
            // User transcript if available
            const inputTx = msg.serverContent?.inputTranscription;
            if (inputTx?.text) {
              onTranscription?.(inputTx.text, 'user');
            }
          },
          onerror: (err: any) => {
            console.error('[VoiceCoach] Live session error:', err);
            toast.error('Voice session interrupted. Please try again.');
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error('[VoiceCoach] connect error:', err);
      toast.error(err.message || 'Failed to establish voice connection.');
      stopSession();
      setState('error');
      setStatusText('Connection failed — tap to retry');
    }
  };

  // ─── Mic → Gemini streaming ───────────────────────────────────────────────
  const startMicCapture = async (
    stream: MediaStream,
    session: any,
    audioContext: AudioContext
  ) => {
    // Wait for AudioContext to be running (auto-resume after user gesture)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated but widely supported for raw PCM access
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!sessionRef.current) return;
      const float32 = e.inputBuffer.getChannelData(0);
      // Convert Float32 → Int16 PCM
      const pcm16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      // Base64-encode and stream to Gemini efficiently
      let binary = ''
      const bytes = new Uint8Array(pcm16.buffer)
      const len = bytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const b64 = btoa(binary)
      try {
        sessionRef.current.sendRealtimeInput({
          media: { data: b64, mimeType: 'audio/pcm;rate=16000' },
        });
      } catch {
        // Session may have closed between frames
      }
    };

    source.connect(processor);
    // Connect to destination (silent — we don't want mic echo)
    processor.connect(audioContext.destination);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const isLoading = state === 'fetching-token' || state === 'connecting';
  const isActive = state === 'active';
  const isError = state === 'error';

  return (
    <div className="fixed bottom-32 md:bottom-10 right-6 md:right-10 z-50 flex items-center gap-3">
      {/* Status pill — shown when session is not idle */}
      {state !== 'idle' && (
        <div
          className={`
            backdrop-blur-xl border rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl
            animate-in fade-in slide-in-from-right-4 transition-colors duration-300
            ${isError
              ? 'bg-red-950/90 border-red-500/30'
              : 'bg-zinc-900/90 border-primary/20'
            }
          `}
        >
          {/* Animated indicator dot */}
          <div
            className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
              isActive ? 'bg-primary animate-pulse' :
              isError ? 'bg-red-400' :
              'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest whitespace-nowrap">
            {statusText}
          </span>
          {/* Audio waveform bars — only when active */}
          {isActive && (
            <div className="flex gap-0.5 items-center h-4">
              {[0.3, 0.6, 1, 0.6, 0.3].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary/60 rounded-full animate-bounce"
                  style={{
                    height: `${h * 16}px`,
                    animationDelay: `${i * 80}ms`,
                    animationDuration: '700ms',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main mic button */}
      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isLoading}
        className={`
          w-14 h-14 md:w-16 md:h-16 rounded-3xl shadow-2xl
          flex items-center justify-center
          transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-primary/30
          ${isLoading
            ? 'bg-zinc-700 cursor-wait'
            : isError
            ? 'bg-amber-500 hover:bg-amber-400 scale-105'
            : isActive
            ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/30'
            : 'bg-gradient-to-br from-primary to-primary/80 hover:scale-105 active:scale-95'
          }
        `}
        aria-label={isActive ? 'End voice session' : 'Start voice session'}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : isActive ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : isError ? (
          <WifiOff className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
        )}
      </button>
    </div>
  );
};
