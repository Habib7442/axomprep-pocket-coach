"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { supabase, createClerkSupabaseClient } from "@/lib/supabase";
import { createCoach, validateCoachCreation } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, 
  MessageSquare, 
  Upload, 
  Settings2, 
  Globe, 
  Book, 
  School,
  Sparkles,
  Loader2,
  ChevronRight,
  GraduationCap,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Coach {
  id: string;
  name: string;
  topic: string;
  language: string;
  class_name: string | null;
  exam_name: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface DashboardClientProps {
    initialCoaches: Coach[];
    initialTier: string;
}

export default function DashboardClient({ initialCoaches, initialTier }: DashboardClientProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>(initialCoaches);
  const [mounted, setMounted] = useState(false);
  
  // Sync state with server data and handle hydration
  useEffect(() => {
    setMounted(true);
    setCoaches(initialCoaches);
  }, [initialCoaches]);

  const [creating, setCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("");
  const [className, setClassName] = useState("");
  const [examName, setExamName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userTier] = useState<string>(initialTier);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  if (!mounted) return null;


  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !topic || !language) {
      toast.error("Please fill in mandatory fields: Name, Topic, and Language");
      return;
    }

    setCreating(true);

    // 1. Validate limit BEFORE uploading PDF
    const validation = await validateCoachCreation();
    if (!validation.allowed) {
      setCreating(false);
      if (validation.errorCode === "LIMIT_REACHED") {
        setShowLimitAlert(true);
      } else {
        toast.error(validation.error || "Validation failed");
      }
      return;
    }

    let pdfUrl = null;

    if (pdfFile) {
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const token = await getToken({ template: 'supabase' });
      const authSupabase = createClerkSupabaseClient(token || "");

      const { error: uploadError } = await authSupabase.storage
        .from('coaches_pdfs')
        .upload(filePath, pdfFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload PDF");
        setCreating(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('coaches_pdfs')
        .getPublicUrl(filePath);
      
      pdfUrl = publicUrl;
    }

    const { data: createdCoach, error: creationError, errorCode } = await createCoach({
      name,
      topic,
      language,
      class_name: className || null,
      exam_name: examName || null,
      pdf_url: pdfUrl
    }) as any;
    
    // Refresh the page data via next/navigation
    router.refresh();

    setCreating(false);
    
    if (creationError) {
      if (errorCode === "LIMIT_REACHED") {
        setShowLimitAlert(true);
      } else {
        toast.error("Error creating coach");
      }
    } else if (createdCoach) {
      toast.success("Coach created successfully!");
      setName("");
      setTopic("");
      setLanguage("");
      setClassName("");
      setExamName("");
      setPdfFile(null);
      
      // Automatically navigate to the new coach's chat page
      router.push(`/dashboard/coach/${createdCoach.id}`);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all rounded-xl py-5 font-bold text-xs"
          onClick={() => {}}
        >
          <Plus className="w-4 h-4 text-primary" />
          New Coach
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 pb-20">
          <div>
            <Label className="px-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Your Coaches</Label>
            <div className="space-y-1">
              {coaches.map((coach) => (
                <Link
                  key={coach.id}
                  href={`/dashboard/coach/${coach.id}`}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-900/80 transition-all text-sm group group-hover:translate-x-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold truncate text-zinc-200">{coach.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{coach.topic}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-zinc-900 bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 overflow-hidden flex items-center justify-center">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-primary font-bold">{user?.firstName?.charAt(0) || 'L'}</div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black truncate">{user?.fullName || 'Learner'}</p>
            <Badge variant="secondary" className="text-[8px] font-mono py-0 px-1.5 opacity-60 uppercase font-black">
              {userTier} TIER
            </Badge>
          </div>
          <Settings2 className="w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-950 pt-20 overflow-hidden text-zinc-100 font-sans">
      <NavbarAction>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-800 scale-90">
              <Menu className="w-5 h-5 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-zinc-950 border-r border-zinc-900 text-white">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access your coaches and settings</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </NavbarAction>

      {/* Sidebar - Chat History Style */}
      <aside className="w-64 lg:w-72 border-r border-zinc-900 bg-zinc-950 flex flex-col hidden md:flex shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Build Your <span className="font-serif italic text-primary">Personal</span> <br /> 
              AI Learning Coach
            </h1>
            <p className="text-zinc-400 text-base md:text-lg font-medium max-w-xl mx-auto uppercase tracking-wide opacity-80">
              Define your coach&apos;s personality and topic to start learning in your native language.
            </p>
          </div>

          <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-2xl rounded-[2rem] shadow-2xl overflow-hidden border">
            <CardContent className="p-6 md:p-10">
              <form onSubmit={handleCreateCoach} className="space-y-8">
                {/* Top Section - Primary Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Coach Name *</Label>
                    <div className="relative group">
                      <Input 
                        placeholder="e.g. Physics Maven" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-zinc-950/50 border-zinc-800 rounded-2xl py-6 focus:ring-primary/20 font-bold placeholder:opacity-30 h-14"
                      />
                      <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-30 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Topic *</Label>
                    <div className="relative group">
                      <Input 
                        placeholder="e.g. Quantum Mechanics" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="bg-zinc-950/50 border-zinc-800 rounded-2xl py-6 focus:ring-primary/20 font-bold placeholder:opacity-30 h-14"
                      />
                      <Book className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-30 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Middle Section - Required Language Selection */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1 flex items-center gap-2">
                    <Globe className="w-3 h-3 text-primary" /> Target Language *
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full bg-zinc-950/50 border-zinc-800 rounded-2xl h-14 font-bold">
                      <SelectValue placeholder="Select your native language" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800">
                      <SelectItem value="assamese">Assamese</SelectItem>
                      <SelectItem value="bengali">Bengali</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="marathi">Marathi</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                      <SelectItem value="bodo">Bodo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional / Advanced Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-800/50">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1 flex items-center gap-2">
                      <School className="w-3 h-3" /> Class (Optional)
                    </Label>
                    <Input 
                      placeholder="e.g. Class 12" 
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="bg-zinc-950/20 border-zinc-800/50 rounded-2xl font-bold h-12"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1 flex items-center gap-2">
                      <GraduationCap className="w-3 h-3" /> Exam (Optional)
                    </Label>
                    <Input 
                      placeholder="e.g. JEE Mains" 
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      className="bg-zinc-950/20 border-zinc-800/50 rounded-2xl font-bold h-12"
                    />
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPdfFile(file);
                      toast.success(`Selected: ${file.name}`);
                    }
                  }}
                />
                <div 
                  className={`group relative flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer ${
                    pdfFile ? "border-primary bg-primary/5" : "border-zinc-800 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className={`w-8 h-8 mb-2 transition-all ${pdfFile ? "text-primary scale-110" : "text-zinc-500 group-hover:text-primary group-hover:scale-110"}`} />
                  <p className={`text-sm font-bold ${pdfFile ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                    {pdfFile ? pdfFile.name : "Upload PDF / Textbook (Optional)"}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest font-black">
                    {pdfFile ? "PDF Attached & Ready" : "Drag and drop files here"}
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={creating}
                  className="w-full bg-primary text-primary-foreground h-16 rounded-2xl text-xl font-black shadow-[0_0_50px_rgba(var(--primary),0.2)] hover:scale-[1.02] active:scale-95 transition-all group"
                >
                  {creating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Summon Your Coach
                      <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Limit Alert Dialog */}
      <AlertDialog open={showLimitAlert} onOpenChange={setShowLimitAlert}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-8">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <AlertDialogTitle className="text-3xl font-black tracking-tighter">
              Upgrade to <span className="font-serif italic text-primary">Pro</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-medium text-lg leading-relaxed">
              You&apos;ve reached your free monthly limit of 2 coaches. <br />
              Upgrade to the <strong className="text-zinc-200">Ultimate Prep Pass</strong> to create up to <strong className="text-zinc-200">20 coaches</strong>, 24/7 voice coaching, and more!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-6">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl h-14 font-bold border-0">
              Maybe Later
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => router.push('/#pricing')}
              className="bg-primary text-primary-foreground hover:opacity-90 rounded-xl h-14 font-black text-lg px-8 shadow-2xl shadow-primary/20"
            >
              Get Prep Pass ₹100
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
