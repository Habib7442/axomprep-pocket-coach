"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SEBA_SCIENCE_CHAPTERS } from "@/lib/constants";
import { GenerationDialog } from "@/components/GenerationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Sparkles, 
  BrainCircuit, 
  Image as ImageIcon, 
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Award
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { QuizQuestion, parseQuizResponse } from "@/lib/utils";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.subjecuniqueId;

  const chapter = SEBA_SCIENCE_CHAPTERS.find((c) => c.id === chapterId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"learn" | "quiz">("learn");

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const generateChapter = async (language: string) => {
    setIsDialogOpen(false);
    setIsGenerating(true);
    setMessages([{ role: "assistant", content: "", images: [] }]);

    try {
      const textResponse = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          type: "learn",
          prompt: `Act as a premium SEBA Class 10 tutor. Generate a high-quality, professional, and very detailed study guide for the Class 10 Science Chapter: "${chapter?.name}" in ${language} language.
          
          Format the content professionally with:
          # ${chapter?.name}
          ## 1. Introduction & Key Definitions
          ... detailed content ...
          [VISUAL: Detailed scientific diagram of ${chapter?.name}]
          
          ## 2. Core Principles & Logic
          ... very detailed scientific explanation ...
          [VISUAL: Comparison table or flow chart of ${chapter?.name}]
          
          ## 3. Important Formulas & Equations
          ... use LaTeX $$ formula $$ ...
          
          ## 4. Past Board Questions & Solutions
          ... be extremely detailed ...
          
          CRITICAL: 
          - Do NOT use any food, chef, or kitchen metaphors. Use straightforward academic language.
          - Be extremely detailed. This should be a full masterclass.
          - Use LaTeX for ALL mathematical formulas and chemical equations.
          - Occasionally include [VISUAL: Description] tags where a visual would help understanding.`,
        }),
      });

      if (!textResponse.ok) throw new Error("Failed");

      const reader = textResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;
        const chunk = decoder.decode(value);
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
                const parsed = JSON.parse(line);
                const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                fullText += textPart;
                setMessages([{ role: "assistant", content: fullText, images: [] }]);
            }
          }
        } catch (e) {}
      }

      // After text is generated, extract [VISUAL: ...] tags and generate images
      const visualMatches = fullText.match(/\[VISUAL: (.*?)\]/g);
      if (visualMatches) {
        for (const match of visualMatches) {
          const description = match.replace("[VISUAL: ", "").replace("]", "");
          try {
            const imgRes = await fetch("/api/generate", {
              method: "POST",
              body: JSON.stringify({ type: "image", prompt: description }),
            });
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              // Iterate through parts to find inlineData
              const partWithImage = imgData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
              const base64 = partWithImage?.inlineData?.data;
              if (base64) {
                setMessages(prev => {
                  const lastMsg = { ...prev[0] };
                  lastMsg.images = [...(lastMsg.images || []), `data:image/png;base64,${base64}`];
                  return [lastMsg];
                });
              }
            }
          } catch (e) {
            console.error("Image generation failed for:", description);
          }
        }
      }
    } catch (error) {
      toast.error("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStudyQuery = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    
    // Add temporary AI message
    const tempAiMsgIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "..." }]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          type: "chat",
          prompt: `Using the context of Chapter: ${chapter?.name}, answer this student query: "${userMsg}". Answer in the language the query was asked in. Be helpful, precise, and professional.`,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;
        const chunk = decoder.decode(value);
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
                const parsed = JSON.parse(line);
                fullText += parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { role: "assistant", content: fullText };
                  return newMsgs;
                });
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      toast.error("Study Coach failed to respond.");
    }
  };

  const generateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setUserAnswers({});
    setIsQuizSubmitted(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          type: "quiz",
          prompt: `Generate 20 high-quality MCQ questions for SEBA Class 10 Science Chapter: "${chapter?.name}". 
          Return ONLY a JSON array of objects with this format: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
          correctAnswer is the 0-indexed index of the options array.`,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      let fullText = "";
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;
        const chunk = decoder.decode(value);
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
              const parsed = JSON.parse(line);
              fullText += parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
          }
        } catch (e) {}
      }

      const parsedQuiz = parseQuizResponse(fullText);
      if (parsedQuiz.length > 0) {
        setQuizQuestions(parsedQuiz);
      } else {
        toast.error("Failed to parse quiz.");
      }
    } catch (error) {
       toast.error("Quiz failed.");
    } finally {
       setIsGeneratingQuiz(false);
    }
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  if (!chapter) return <div>Chapter not found</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-primary/40 pb-32">
      {/* Sleek Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-24 flex items-center justify-between px-10 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight font-serif flex items-center gap-3">
              {chapter.name}
              <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3">
                {chapter.marks} Marks
              </Badge>
            </h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Chapter {chapter.id.replace("ch","")}</p>
          </div>
        </div>

        <div className="flex gap-4">
           <button 
            onClick={() => setIsDialogOpen(true)}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-black flex items-center gap-2 hover:bg-white/10 transition-all"
           >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
           </button>
           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
              <button 
                onClick={() => setActiveTab("learn")}
                className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${activeTab === "learn" ? "bg-primary text-primary-foreground" : "text-zinc-500 hover:text-white"}`}
              >
                STUDY
              </button>
              <button 
                onClick={() => setActiveTab("quiz")}
                className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${activeTab === "quiz" ? "bg-primary text-primary-foreground" : "text-zinc-500 hover:text-white"}`}
              >
                QUIZ
              </button>
           </div>
        </div>
      </nav>

      {/* Main Study Experience */}
      <main className="w-full pt-32 px-10">
        {activeTab === "learn" ? (
          <div className="w-full space-y-12">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="w-full space-y-10">
                    <div className="prose prose-invert prose-p:text-xl prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-black prose-headings:tracking-tight max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.images && msg.images.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                        {msg.images.map((img: string, i: number) => (
                          <div key={i} className="group relative rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
                             <img src={img} alt="Learning Visual" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex items-end">
                                <p className="text-white font-bold text-sm tracking-widest flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4 text-primary" /> SECTION VISUAL {i+1}
                                </p>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] max-w-[80%] text-primary font-bold">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            
            {isGenerating && messages[0]?.content === "" && (
               <div className="py-40 text-center space-y-6">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto animate-pulse">
                     <BrainCircuit className="w-16 h-16 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black font-serif italic">Deep Diving Into Concepts...</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.3em]">AI is curating your masterclass</p>
               </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-10">
            {quizQuestions.length === 0 ? (
                <div className="text-center space-y-8 py-20">
                   <div className="w-32 h-32 rounded-[3.5rem] bg-zinc-900 flex items-center justify-center mx-auto border border-white/5">
                      <ClipboardCheck className="w-16 h-16 text-primary" />
                   </div>
                   <h2 className="text-5xl font-black font-serif">Mastery Check</h2>
                   <p className="text-zinc-400 text-xl font-medium max-w-lg mx-auto leading-relaxed">20 Advanced Multiple Choice Questions to verify your technical understanding of this chapter.</p>
                   <button 
                    onClick={generateQuiz}
                    disabled={isGeneratingQuiz}
                    className="h-20 px-12 rounded-[2rem] bg-primary text-primary-foreground font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-primary/20"
                   >
                     {isGeneratingQuiz ? "COMPILING QUESTIONS..." : "START 20 MCQ ASSESSMENT"}
                   </button>
                </div>
            ) : (
              <div className="space-y-16">
                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-8 p-10 bg-white/5 rounded-[3.5rem] border border-white/5 backdrop-blur-xl">
                       <h3 className="text-3xl font-bold leading-tight">
                         <span className="text-primary/40 mr-4 font-serif italic text-4xl">Q{idx + 1}</span>
                         {q.question}
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((option, optIdx) => {
                            const isSelected = userAnswers[idx] === optIdx;
                            const isCorrect = q.correctAnswer === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => !isQuizSubmitted && setUserAnswers({ ...userAnswers, [idx]: optIdx })}
                                className={cn(
                                  "p-8 rounded-[1.5rem] text-left font-black transition-all flex items-center justify-between border-2",
                                  !isQuizSubmitted && isSelected && "bg-primary/20 border-primary text-primary",
                                  !isQuizSubmitted && !isSelected && "bg-white/5 border-transparent hover:bg-white/10",
                                  isQuizSubmitted && isCorrect && "bg-green-500/20 border-green-500 text-green-400",
                                  isQuizSubmitted && isSelected && !isCorrect && "bg-red-500/20 border-red-500 text-red-400",
                                  isQuizSubmitted && !isSelected && !isCorrect && "opacity-20 grayscale border-transparent"
                                )}
                              >
                                {option}
                                {isQuizSubmitted && isCorrect && <CheckCircle2 className="w-6 h-6" />}
                                {isQuizSubmitted && isSelected && !isCorrect && <XCircle className="w-6 h-6" />}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  ))}
                  
                  {!isQuizSubmitted ? (
                    <button 
                      onClick={() => setIsQuizSubmitted(true)}
                      className="w-full h-24 rounded-[3rem] bg-primary text-primary-foreground font-black text-3xl shadow-3xl shadow-primary/30 hover:scale-[1.02] transition-all"
                    >
                      SUBMIT ASSESSMENT
                    </button>
                  ) : (
                    <div className="bg-primary p-20 rounded-[4rem] text-center space-y-8 ring-[20px] ring-primary/10">
                       <Award className="w-24 h-24 mx-auto" />
                       <h2 className="text-7xl font-black font-serif italic">Grade: {calculateScore()}/20</h2>
                       <p className="text-2xl font-bold opacity-90 max-w-xl mx-auto leading-relaxed">
                         {calculateScore() >= 17 ? "Exceptional! You have achieved deep mastery level." : "Strong attempt. Review technical gaps and re-assess."}
                       </p>
                       <button 
                          onClick={generateQuiz}
                          className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                       >
                         Retake Different Set
                       </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Interactive Coach - Matches requested image style */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 pointer-events-none">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 pointer-events-auto">
          {/* Action Row - From requested image */}
          <div className="flex gap-3 justify-center">
             <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
               <ImageIcon className="w-3 h-3 text-primary" /> Save to notes
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
               <RefreshCw className="w-3 h-3 text-zinc-500" /> Regenerate
             </button>
          </div>

          <div className="relative group">
            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStudyQuery()}
              placeholder="Start typing your doubt..."
              className="w-full h-20 bg-[#151515]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] pl-10 pr-32 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-zinc-600 shadow-3xl"
            />
            <div className="absolute right-4 top-4 bottom-4 flex items-center gap-4 pr-4">
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest hidden sm:block">Ask anything</span>
               <button 
                onClick={handleStudyQuery}
                className="w-12 h-12 bg-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl shadow-primary/30"
               >
                 <Sparkles className="w-5 h-5 text-primary-foreground" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <GenerationDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onGenerate={generateChapter}
        title="Knowledge Engine"
        description="Select your preferred language for this technical deep dive."
      />
    </div>
  );
}

// Utility for cleaner class management
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
