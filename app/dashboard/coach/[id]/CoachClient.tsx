"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  Globe,
  Plus,
  Menu
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavbarAction } from "@/components/NavbarAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { VoiceCoach } from "@/components/coach/VoiceCoach";
import { useUser } from "@clerk/nextjs";

interface Coach {
  id: string;
  name: string;
  topic: string;
  language: string;
  class_name: string | null;
  exam_name: string | null;
  pdf_url: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CoachClientProps {
    coach: Coach;
    initialMessages: Message[];
}

export default function CoachClient({ coach, initialMessages }: CoachClientProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingInfo, setGeneratingInfo] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: coach.id, role, content }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const generateToolOutput = async (type: 'quiz' | 'infographics') => {
    const setter = type === 'quiz' ? setGeneratingQuiz : setGeneratingInfo;
    setter(true);
    const loadingToast = toast.loading(`Generating your ${type}...`, {
      description: type === 'quiz' ? "Creating 15 specialized questions." : "Designing a detailed educational visual."
    });

    try {
      const res = await fetch(`/api/study-tools/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          coachId: coach.id, 
          topic: coach.topic, 
          language: coach.language 
        }),
      });

      if (!res.ok) throw new Error(`Failed to generate ${type}`);
      const data = await res.json();
      
      const content = type === 'quiz' 
        ? `[QUIZ_DATA]${JSON.stringify(data.data)}` 
        : `[INFOGRAPHIC_DATA]${data.image_url}`;

      const assistantMessage: Message = { role: "assistant", content };
      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage("assistant", content);
      
      toast.success(`${type === 'quiz' ? 'Quiz' : 'Infographic'} is ready!`, { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setter(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    await saveMessage("user", input);
    
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: messages,
          coach: {
            name: coach.name,
            topic: coach.topic,
            language: coach.language,
            className: coach.class_name,
            examName: coach.exam_name,
            pdfUrl: coach.pdf_url
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = { role: "assistant", content: data.text };
      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage("assistant", data.text);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error connecting to your coach");
    } finally {
      setSending(false);
    }
  };

  const [quizSelections, setQuizSelections] = useState<Record<string, number>>({});

  const handleQuizSelect = (messageIdx: number, questionIdx: number, optionIdx: number) => {
    const key = `${messageIdx}-${questionIdx}`;
    setQuizSelections(prev => ({
      ...prev,
      [key]: optionIdx
    }));
  };

  const handleDownloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `infographic-${coach.topic || 'study'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Infographic download started!");
  };

  const renderMessageContent = (content: string, messageIdx: number) => {
    if (content.startsWith("[QUIZ_DATA]")) {
      const quizQuestions = JSON.parse(content.replace("[QUIZ_DATA]", ""));
      return (
        <div className="space-y-6 w-full max-w-2xl bg-zinc-950/50 p-6 rounded-3xl border border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
               <h4 className="font-bold text-lg text-white">Specialized Quiz</h4>
               <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">15 Questions • Different Every Time</p>
            </div>
          </div>
          <div className="space-y-8">
            {quizQuestions.map((q: any, i: number) => {
              const selectionKey = `${messageIdx}-${i}`;
              const selectedOption = quizSelections[selectionKey];

              return (
                <div key={i} className="space-y-3">
                  <p className="font-bold text-white flex gap-3">
                    <span className="text-primary opacity-50">{i + 1}.</span> {q.question}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-7">
                    {q.options.map((opt: string, oi: number) => {
                      const isSelected = selectedOption === oi;
                      return (
                        <Button 
                          key={oi} 
                          variant="outline" 
                          onClick={() => handleQuizSelect(messageIdx, i, oi)}
                          className={`justify-start text-xs border-zinc-800 bg-zinc-900/40 hover:bg-primary/10 hover:border-primary/30 transition-all rounded-xl py-5 text-white ${
                            isSelected ? "border-primary bg-primary/20 ring-1 ring-primary" : ""
                          }`}
                        >
                          {opt}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="w-full mt-6 bg-primary border border-primary/20 text-white hover:bg-primary/90 rounded-2xl py-6 font-bold uppercase tracking-widest text-xs">
            Submit Your Answers
          </Button>
        </div>
      );
    }

    if (content.startsWith("[INFOGRAPHIC_DATA]")) {
      const imageUrl = content.replace("[INFOGRAPHIC_DATA]", "");
      return (
        <div className="space-y-4 w-full max-w-2xl">
           <div className="relative group rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl transition-all hover:border-primary/40">
              <img src={imageUrl} alt="Educational Infographic" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                 <p className="text-xs font-bold text-white uppercase tracking-widest">Detailed Visual Aid Generated for {coach.topic}</p>
              </div>
           </div>
           <Button 
             onClick={() => handleDownloadImage(imageUrl)}
             className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 font-bold text-xs hover:bg-zinc-800 text-white transition-all hover:border-primary/40"
           >
             Download Infographic
           </Button>
        </div>
      );
    }

    return (
      <div
        className="prose prose-sm prose-invert max-w-none 
        prose-headings:font-serif prose-headings:mb-2 prose-headings:mt-4
        prose-p:leading-relaxed prose-p:mb-3
        prose-strong:text-primary prose-strong:font-black
        prose-ul:my-2 prose-li:my-0.5
        prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const SidebarContent = () => {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 space-y-4">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 hover:bg-zinc-900 transition-all rounded-xl text-xs font-bold text-white"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center font-serif text-lg italic text-primary">
                {coach.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-xs tracking-tight">{coach.name}</h2>
                <Badge
                  variant="secondary"
                  className="text-[7px] font-mono px-1 py-0 h-3 leading-none text-white bg-zinc-800"
                >
                  ACTIVE
                </Badge>
              </div>
            </div>

            <div className="space-y-1 pt-1.5 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-[10px] text-white">
                <Sparkles className="w-2.5 h-2.5 text-primary/60" />
                <span className="font-medium truncate">{coach.topic}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white">
                <Globe className="w-2.5 h-2.5 text-primary/60" />
                <span className="font-medium capitalize">{coach.language}</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            <p className="px-2 text-[10px] font-black uppercase tracking-widest text-white opacity-60">
              Study Tools Available
            </p>
            <div className="space-y-2">
               <Button 
                 onClick={() => generateToolOutput('quiz')}
                 disabled={generatingQuiz}
                 className="w-full justify-start gap-3 bg-zinc-900 hover:bg-zinc-800 border-zinc-800 rounded-xl text-[10px] font-bold h-12 text-white"
               >
                 {generatingQuiz ? <Loader2 className="w-3 h-3 animate-spin text-white"/> : <Sparkles className="w-3 h-3 text-primary"/>}
                 Generate Quiz
               </Button>
               <Button 
                  onClick={() => generateToolOutput('infographics')}
                  disabled={generatingInfo}
                  className="w-full justify-start gap-3 bg-zinc-900 hover:bg-zinc-800 border-zinc-800 rounded-xl text-[10px] font-bold h-12 text-white"
               >
                 {generatingInfo ? <Loader2 className="w-3 h-3 animate-spin text-white"/> : <Plus className="w-3 h-3 text-primary"/>}
                 Generate Infographics
               </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col pt-[72px]">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 lg:w-72 border-r border-zinc-900 bg-zinc-950 flex flex-col shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Chat Interface */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-zinc-950">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 p-4 border-b border-zinc-900 shrink-0">
            <NavbarAction>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-800 scale-90">
                    <Menu className="w-5 h-5 text-white" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-zinc-950 border-r border-zinc-900">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Coach Selection</SheetTitle>
                    <SheetDescription>Select a different coach or study tool</SheetDescription>
                  </SheetHeader>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </NavbarAction>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">{coach.name}</h1>
              <p className="text-[10px] text-zinc-100 truncate">{coach.topic}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="max-w-3xl mx-auto pt-8 pb-48 px-6 space-y-8">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center font-serif text-xl italic text-primary relative z-10 drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                      {coach.name.charAt(0)}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold tracking-tight text-white">
                      I'm ready!
                    </h3>
                    <p className="text-zinc-400 max-w-sm text-xs font-medium">
                      Ask me anything about{" "}
                      <span className="text-primary font-bold">{coach.topic}</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-6 px-4">
                     {[
                       { label: "Deep Dive", prompt: `Explain ${coach.topic} in deep detail with examples.` },
                       { label: "Important Topics", prompt: `What are the 10 most important topics in ${coach.topic}?` },
                       { label: "Exam Questions", prompt: `Give me 5 most probable questions for the exam on ${coach.topic}.` },
                       { label: "Core Concepts", prompt: `Summarize the core concepts of ${coach.topic} in simple terms.` },
                     ].map((item, i) => (
                       <Button
                         key={i}
                         onClick={() => {
                           setInput(item.prompt);
                           setTimeout(() => {
                            const form = document.querySelector('form');
                            form?.requestSubmit();
                           }, 50);
                         }}
                         variant="outline"
                         className="bg-zinc-900/40 border-zinc-800/50 rounded-[1.5rem] p-5 h-auto text-left flex flex-col items-start gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all group w-full"
                       >
                         <span className="text-primary group-hover:translate-x-1 transition-transform font-black text-xs uppercase tracking-tight">
                           # {item.label}
                         </span>
                         <span className="opacity-50 text-[11px] font-medium leading-relaxed whitespace-normal break-words">
                           {item.prompt}
                         </span>
                       </Button>
                     ))}
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${
                      m.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-serif italic text-lg shadow-lg ${
                        m.role === "user"
                          ? "bg-zinc-800 border border-zinc-700 text-zinc-400"
                          : "bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/30 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                      }`}
                    >
                      {m.role === "user"
                        ? user?.firstName?.charAt(0) || "U"
                        : coach.name.charAt(0)}
                    </div>
                    <div
                      className={`flex flex-col max-w-[90%] space-y-1 ${
                        m.role === "user" ? "items-end" : ""
                      }`}
                    >
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none font-bold"
                            : "bg-zinc-900/60 border border-zinc-800/50 rounded-tl-none text-zinc-200"
                        }`}
                      >
                        {m.role === "user" ? m.content : renderMessageContent(m.content, idx)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {sending && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-serif italic text-primary text-lg">
                    {coach.name.charAt(0)}
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-10">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex flex-col gap-3 mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  <Button 
                    onClick={() => generateToolOutput('quiz')}
                    disabled={generatingQuiz}
                    variant="outline"
                    className="shrink-0 bg-zinc-900/50 border-zinc-800 rounded-xl px-4 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 transition-all gap-2 text-white"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    Generate Quiz
                  </Button>
                  <Button 
                    onClick={() => generateToolOutput('infographics')}
                    disabled={generatingInfo}
                    variant="outline"
                    className="shrink-0 bg-zinc-900/50 border-zinc-800 rounded-xl px-4 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 transition-all gap-2 text-white"
                  >
                    <Plus className="w-3 h-3 text-primary" />
                    Generate Visuals
                  </Button>
                </div>
              </div>

              <form className="relative group" onSubmit={handleSendMessage}>
                <Input
                  placeholder={`Ask ${coach.name} about ${coach.topic}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-zinc-900/80 backdrop-blur-xl border-zinc-800 focus:border-primary/50 focus:ring-primary/20 rounded-2xl py-7 pl-6 pr-16 font-medium text-zinc-200 h-14 md:h-16 shadow-2xl"
                />
                <Button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="absolute right-2 top-2 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary text-primary-foreground shadow-xl p-0 flex items-center justify-center border-none"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
              <p className="text-center text-[8px] text-zinc-100 font-bold uppercase tracking-[0.2em] opacity-40">
                Axomprep Coach can make mistakes. Verify important info.
              </p>
            </div>
          </div>
        </main>
      </div>

      <VoiceCoach 
        coachName={coach.name}
        topic={coach.topic}
        language={coach.language}
        onTranscription={async (text, role) => {
          setMessages(prev => {
            if (prev.length > 0 && prev[prev.length - 1].content === text) return prev;
            return [...prev, { role, content: text }];
          });
          await saveMessage(role, text);
        }}
      />
    </div>
  );
}
