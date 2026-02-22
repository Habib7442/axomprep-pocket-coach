
"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceCoachProps {
  coachId: string;
  coachName: string;
  topic: string;
  language: string;
  onTranscription?: (text: string, role: 'user' | 'assistant') => void;
}

export const VoiceCoach: React.FC<VoiceCoachProps> = ({ 
  coachId,
  coachName, 
  topic, 
  language,
  onTranscription 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Voice Ready");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const actualMimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        await processAudio(audioBlob);
      };

      recorder.start();
      setIsActive(true);
      setStatus("Listening...");
    } catch (err) {
      console.error("Mic access error:", err);
      toast.error("Could not access microphone");
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsActive(false);
    setStatus("Processing...");
  };

  const processAudio = async (blob: Blob) => {
    setLoading(true);
    try {
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read audio'));
      reader.readAsDataURL(blob);
    });
    
    const response = await fetch('/api/coach-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coachId,
        audioBase64: base64Audio,
        mimeType: blob.type
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to get response from coach");
    }
    
    const data = await response.json();
    if (data.text) {
      onTranscription?.(data.text, 'assistant');
    }
    
    if (data.audio) {
      await playResponse(data.audio);
    }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Voice processing failed";
      toast.error(message);
      setStatus("Voice Ready");
    } finally {
      setLoading(false);
    }
  };

  const playResponse = async (base64Audio: string) => {
    return new Promise((resolve) => {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      currentAudioRef.current = audio;
      setStatus("Speaking...");
      audio.onended = () => {
        currentAudioRef.current = null;
        setStatus("Voice Ready");
        resolve(true);
      };
      audio.play().catch(err => {
        console.error("Playback error:", err);
        setStatus("Voice Ready");
        resolve(false);
      });
    });
  };

  const toggleSession = () => {
    if (isActive) {
      stopRecording();
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      startRecording();
    }
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
        onClick={toggleSession}
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
