
"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decodeBase64, decodeAudioData, encodeBase64 } from '@/lib/audio-utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceCoachProps {
  coachName: string;
  topic: string;
  language: string;
  onTranscription?: (text: string, role: 'user' | 'assistant') => void;
}

export const VoiceCoach: React.FC<VoiceCoachProps> = ({ 
  coachName, 
  topic, 
  language,
  onTranscription 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Voice Ready");
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const assistantBufferRef = useRef("");
  const userBufferRef = useRef("");

  const getSystemInstruction = (lang: string) => {
    return `You are ${coachName}, an elite personal AI coach teaching ${topic}. 
    Speak primarily in ${lang}. Use simple, clear, and encouraging tone. 
    Maintain a helpful and academic persona. 
    Provide sharp, concise audio responses suitable for live conversation.`;
  };

  const startSession = async () => {
    if (loading || isActive) return;
    setLoading(true);
    setStatus("Connecting...");
    
    try {
      const configRes = await fetch('/api/config/gemini');
      const { key } = await configRes.json();
      if (!key) throw new Error("API Key missing");

      const genAI = new GoogleGenAI({ apiKey: key });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await inputCtx.resume();
      await outputCtx.resume();
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const sessionPromise = genAI.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025', 
        callbacks: {
          onopen: () => {
            console.log("WebSocket opened successfully");
            setStatus("Live");
            setIsActive(true);
            setLoading(false);

            // Greet the user first immediately upon connection
            sessionPromise.then(session => {
              if (session) {
                session.sendRealtimeInput({
                  text: `Hello! I am ${coachName}. I am ready to help you with ${topic}. Please greet the student in ${language}. Keep it very short.` 
                });
              }
            });

            console.log("Session ready for voice interaction.");

            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            sourceNodeRef.current = source;
            scriptProcessorRef.current = scriptProcessor;
            
            let chunkCount = 0;
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { 
                data: encodeBase64(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              
              chunkCount++;
              if (chunkCount % 50 === 0) console.log("Audio chunks sent to AI:", chunkCount);

              sessionPromise.then(session => {
                if (session) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              }).catch(err => console.error("Send error:", err));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: any) => {
            console.log("Live Message Received:", JSON.stringify(message, (key, value) => {
              if (key === 'data' && typeof value === 'string' && value.length > 50) return `[Binary Data: ${value.length} bytes]`;
              return value;
            }, 2));
            
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              console.log(`Received modelTurn with ${parts.length} parts`);
            }

            const audioData = parts?.[0]?.inlineData?.data || parts?.[1]?.inlineData?.data;
            
            if (audioData) {
              if (outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();
                
                try {
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                  });
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                  console.log("Playing audio buffer. Duration:", buffer.duration);
                } catch (audioErr) {
                  console.error("Audio Decode Error:", audioErr);
                }
              }
            }

            if (message.serverContent?.inputTranscription) {
              userBufferRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              assistantBufferRef.current += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              console.log("Turn Complete. Emitting transcriptions.");
              if (userBufferRef.current) {
                onTranscription?.(userBufferRef.current, 'user');
                userBufferRef.current = "";
              }
              if (assistantBufferRef.current) {
                onTranscription?.(assistantBufferRef.current, 'assistant');
                assistantBufferRef.current = "";
              }
            }

            if (message.serverContent?.interrupted) {
              console.log("Playback Interrupted");
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              // Clear assistant buffer on interruption to stay synced
              assistantBufferRef.current = "";
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopSession();
          },
          onclose: (e) => {
            console.log("WebSocket closed:", e);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: getSystemInstruction(language) as any
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setLoading(false);
      setStatus("Error");
      toast.error(err.message || "Voice session failed");
      console.error(err);
      stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setLoading(false);
    setStatus("Voice Ready");
    
    if (scriptProcessorRef.current) { 
      try { 
        scriptProcessorRef.current.onaudioprocess = null; 
        scriptProcessorRef.current.disconnect(); 
      } catch (e) {}
    }
    if (sourceNodeRef.current) try { sourceNodeRef.current.disconnect(); } catch (e) {}
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (sessionRef.current) try { sessionRef.current.close(); } catch(e) {}
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      try { inputAudioContextRef.current.close(); } catch(e) {}
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      try { outputAudioContextRef.current.close(); } catch(e) {}
    }

    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionRef.current = null;
    mediaStreamRef.current = null;
  };

  return (
    <div className="fixed bottom-32 md:bottom-10 right-6 md:right-10 z-50 flex items-center gap-3">
      {isActive && (
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-right-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{status}</span>
          <div className="flex gap-1">
             {[1,2,3].map(i => (
               <div key={i} className="w-1 h-3 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }} />
             ))}
          </div>
        </div>
      )}
      
      <Button
        onClick={isActive ? stopSession : startSession}
        disabled={loading}
        size="icon"
        className={`w-14 h-14 md:w-16 md:h-16 rounded-3xl shadow-2xl transition-all duration-300 group border-none ${
          isActive 
          ? 'bg-red-500 hover:bg-red-600 scale-110' 
          : 'bg-gradient-to-br from-primary to-primary-foreground hover:scale-105 active:scale-95'
        }`}
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isActive ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        )}
      </Button>
    </div>
  );
};
