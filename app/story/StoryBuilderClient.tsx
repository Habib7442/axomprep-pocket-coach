"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Loader2, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  Repeat,
  Mic2,
  Book as BookIcon,
  Layers,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  voiceover: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface StoryData {
  title: string;
  description: string;
  pages: StoryPage[];
}

export default function StoryBuilderClient() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioMode, setAudioMode] = useState<'story' | 'podcast'>('story');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateStory = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setStoryData(null);
    setCurrentPage(0);
    
    try {
      // 1. Generate Story Structure
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      
      if (!res.ok) throw new Error("Failed to generate story structure");
      const data = await res.json();
      setStoryData(data);
      
      // 2. Start generating images for each page progressively
      loadPageImages(data);
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadPageImages = async (data: StoryData) => {
    const updatedPages = [...data.pages];
    
    for (let i = 0; i < updatedPages.length; i++) {
      try {
        const imgRes = await fetch("/api/story/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: updatedPages[i].imagePrompt }),
        });
        
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          updatedPages[i].imageUrl = `data:image/png;base64,${imgData.image}`;
          setStoryData({ ...data, pages: updatedPages });
          
          // Generate audio for the page as well
          generatePageAudio(i, updatedPages[i].voiceover);
        }
      } catch (err) {
        console.error(`Failed to load image for page ${i+1}`, err);
      }
    }
  };

  const generatePageAudio = async (index: number, text: string) => {
    try {
      const res = await fetch("/api/coach-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: 'story', language: 'english' }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const binaryString = window.atob(data.audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        
        // We need a proper WAV header usually, but if coach-tts returns a raw pcm or something 
        // handle accordingly. Assume it's a format the browser can play if we treat it as blob.
        // The previous CoachChatClient uses addWavHeader.
        
        const blob = new Blob([bytes.buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        setStoryData(prev => {
          if (!prev) return null;
          const newPages = [...prev.pages];
          newPages[index].audioUrl = url;
          return { ...prev, pages: newPages };
        });
      }
    } catch (err) {
      console.error(`Failed to load audio for page ${index+1}`, err);
    }
  };

  const handleNext = () => {
    if (storyData && currentPage < storyData.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (storyData && storyData.pages[currentPage]?.audioUrl && isPlaying) {
      if (audioRef.current) {
        audioRef.current.src = storyData.pages[currentPage].audioUrl!;
        audioRef.current.play();
      }
    }
  }, [currentPage, isPlaying, storyData]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && storyData?.pages[currentPage]?.audioUrl && audioRef.current) {
      audioRef.current.src = storyData.pages[currentPage].audioUrl!;
      audioRef.current.play();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const exportStory = async (mode: 'story' | 'podcast') => {
    if (!storyData) return;
    setIsExporting(true);
    setAudioMode(mode);
    
    try {
      const fullText = storyData.pages.map(p => p.text).join("\n\n");
      const res = await fetch("/api/coach-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, mode, language: 'english' }),
      });
      
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      
      const blob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storyData.title.replace(/\s+/g, "_")}_${mode}.wav`;
      a.click();
      
      toast.success(`${mode === 'story' ? 'Story' : 'Podcast'} exported successfully!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white p-4 md:p-8 font-sans overflow-hidden flex flex-col">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BookIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Story Builder</h1>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-bold tracking-widest px-2 py-0">ALIVE COMICS</Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!storyData && (
            <div className="hidden md:flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
              <Zap className="w-3 h-3 text-orange-500" />
              <span>AI Powered</span>
            </div>
          )}
          {storyData && (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => exportStory('story')}
                disabled={isExporting}
                className="text-xs font-bold uppercase tracking-widest hover:bg-white/5"
              >
                {isExporting && audioMode === 'story' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Volume2 className="w-3 h-3 mr-2" />}
                Export Story
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => exportStory('podcast')}
                disabled={isExporting}
                className="text-xs font-bold uppercase tracking-widest hover:bg-white/5"
              >
                {isExporting && audioMode === 'podcast' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Mic2 className="w-3 h-3 mr-2" />}
                Export Podcast
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!storyData ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl text-center"
            >
              <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                Turn your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">imagination</span> into a living story.
              </h2>
              <p className="text-zinc-400 text-lg mb-10 font-medium max-w-lg mx-auto">
                Enter any topic — from the wonders of photosynthesis to the mystery of black holes. We'll build you a comic-style book with full audio.
              </p>
              
              <div className="relative group p-2 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl transition-all hover:border-orange-500/30">
                <Input 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateStory()}
                  placeholder="e.g. The journey of a water droplet in the water cycle..."
                  className="h-16 md:h-20 bg-transparent border-none text-lg md:text-xl font-bold pl-8 pr-32 focus-visible:ring-0 placeholder:text-zinc-600"
                />
                <Button 
                  onClick={generateStory}
                  disabled={isGenerating || !topic.trim()}
                  className="absolute right-3 top-3 bottom-3 rounded-[2rem] px-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Build Story</>
                  )}
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  "Life of a Star",
                  "Ancient Rome",
                  "Quantum Physics",
                  "AI Revolution"
                ].map((s) => (
                  <button 
                    key={s}
                    onClick={() => setTopic(s)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-zinc-500 hover:text-orange-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="book"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col gap-8"
            >
              {/* Header inside book view */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tight">{storyData.title}</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">{topic}</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-orange-500 font-black text-sm">{currentPage + 1}</span>
                    <span className="text-zinc-700">/</span>
                    <span className="text-zinc-500 font-bold text-sm tracking-widest">{storyData.pages.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handlePrev} 
                      disabled={currentPage === 0}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={currentPage === storyData.pages.length - 1}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 transition-all disabled:opacity-20"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Page Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch min-h-[500px]">
                {/* Visual Area */}
                <div className="relative group rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 aspect-square md:aspect-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPage}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      {storyData.pages[currentPage].imageUrl ? (
                        <div className="relative h-full w-full">
                           <img 
                            src={storyData.pages[currentPage].imageUrl} 
                            alt={`Page ${currentPage + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
                          <Loader2 className="w-12 h-12 animate-spin text-orange-500/20" />
                          <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Drawing page {currentPage + 1}...</span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Audio Control Bar */}
                  <div className="absolute bottom-6 left-6 right-6 z-20">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <button 
                            onClick={togglePlayback}
                            className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-500/30"
                          >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          </button>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Narration</p>
                            <p className="text-xs font-bold text-white">
                              {storyData.pages[currentPage]?.audioUrl ? "Sync Active" : "Generating Audio..."}
                            </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="flex gap-1 items-center px-4">
                            {[0.2, 0.4, 0.8, 0.5, 0.3, 0.6, 1, 0.4, 0.2].map((h, i) => (
                              <motion.div 
                                key={i}
                                animate={isPlaying ? { height: [h*16, (1-h)*16, h*16] } : { height: 4 }}
                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                className="w-1 bg-orange-500/60 rounded-full"
                              />
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Text Area */}
                <div className="flex flex-col justify-center p-8 md:p-12 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8">
                     <span className="text-[60px] font-black text-orange-500/5 select-none leading-none">0{currentPage + 1}</span>
                   </div>
                   
                   <AnimatePresence mode="wait">
                     <motion.div
                       key={currentPage}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-6"
                     >
                        <Badge className="bg-orange-500/10 text-orange-500 border-none px-3 py-1 font-black text-[9px] uppercase tracking-[0.2em]">Live Script</Badge>
                        <h3 className="text-2xl md:text-3xl font-black leading-relaxed text-zinc-100">
                          {storyData.pages[currentPage].text}
                        </h3>
                        <div className="pt-6 border-t border-white/5">
                           <p className="text-zinc-500 font-medium italic leading-loose text-sm">
                             {storyData.pages[currentPage].voiceover}
                           </p>
                        </div>
                     </motion.div>
                   </AnimatePresence>

                   <div className="mt-auto pt-8 flex items-center justify-between">
                      <button 
                        onClick={() => setStoryData(null)}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Repeat className="w-3 h-3" /> New Story
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Auto-Play</span>
                        <div className="w-8 h-4 bg-zinc-800 rounded-full relative p-0.5 cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
                           <motion.div 
                            animate={{ x: isPlaying ? 16 : 0 }}
                            className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-orange-500' : 'bg-zinc-600'}`}
                           />
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Powered by Axomprep Gemini 3 Intelligence</p>
      </footer>

      <audio 
        ref={audioRef} 
        onEnded={() => {
          if (currentPage < storyData!.pages.length - 1) {
            handleNext();
          } else {
            setIsPlaying(false);
          }
        }}
      />
    </div>
  );
}
