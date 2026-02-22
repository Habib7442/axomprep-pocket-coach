"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
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
  Menu,
  LogOut,
  Zap,
  Copy
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
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
    userProfile: any;
}

export default function DashboardClient({ initialCoaches, initialTier, userProfile }: DashboardClientProps) {
  const supabaseBrowser = createClient();
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>(initialCoaches);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setCoaches(initialCoaches);
  }, [initialCoaches]);

  const [creating, setCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState(userProfile?.native_language || "");
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
      const filePath = `${userProfile?.id}/${fileName}`;

      const { error: uploadError } = await supabaseBrowser.storage
        .from('coaches_pdfs')
        .upload(filePath, pdfFile);

      if (uploadError) {
        toast.error("Failed to upload PDF");
        setCreating(false);
        return;
      }

      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('coaches_pdfs')
        .getPublicUrl(filePath);
      
      pdfUrl = publicUrl;
    }

    const result = await createCoach({
      name,
      topic,
      language,
      class_name: className || null,
      exam_name: examName || null,
      pdf_url: pdfUrl
    }) as any;
    
    const { data: createdCoach, error: creationError } = result;

    if (creationError) {
      toast.error(creationError || "Failed to create coach");
      setCreating(false);
      return;
    }

    toast.success("Coach created successfully!");
    router.refresh();
    router.push(`/coach/${createdCoach.id}`);
  };

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.push('/');
  };

  const firstName = userProfile?.full_name?.split(' ')[0] || 'Learner';
  const initials = (userProfile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-zinc-100">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img 
            src="/logo.png" 
            alt="AXOMPREP" 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-bold tracking-tighter text-lg">AXOMPREP</span>
        </Link>
      </div>

      {/* New Coach Button */}
      <div className="p-4">
        <button 
          onClick={() => document.getElementById('coach-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Coach
        </button>
      </div>

      {/* Coaches List */}
      <div className="flex-1 overflow-y-auto px-4">
        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-3">Your Coaches</p>
        <div className="space-y-1">
          {coaches.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">No coaches yet.<br />Create your first one!</p>
            </div>
          )}
          {coaches.map((coach) => (
            <Link
              key={coach.id}
              href={`/coach/${coach.id}`}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-orange-50/60 transition-all text-sm group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center border border-orange-100">
                <MessageSquare className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold truncate text-zinc-800 text-[13px]">{coach.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{coach.topic}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-zinc-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-zinc-50 to-orange-50/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-black text-sm">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-zinc-800">{userProfile?.full_name || 'Learner'}</p>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600">
                <Zap className="w-2.5 h-2.5" /> {userProfile?.credits ?? 0} credits
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/profile" className="p-2 hover:bg-white rounded-lg transition-colors" title="Settings">
              <Settings2 className="w-4 h-4 text-zinc-400" />
            </Link>
            <button 
              onClick={handleSignOut}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group/logout"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-zinc-400 group-hover/logout:text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden text-zinc-900 font-sans">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-lg shadow-black/5">
            <Menu className="w-5 h-5 text-zinc-700" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-white border-r border-zinc-100 text-zinc-900">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access your coaches and settings</SheetDescription>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="w-64 lg:w-72 border-r border-zinc-100 bg-white flex-col hidden md:flex shrink-0">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Background Glows - matching landing page */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-orange-100/40 via-blue-50/20 to-transparent blur-[120px] -z-0 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-orange-50/30 blur-[150px] rounded-full -z-0 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto py-10 px-6 md:px-10">
          {/* Welcome Section */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-widest text-orange-600 mb-4">
              <Sparkles className="w-3 h-3" />
              {userTier === 'pro' ? 'Pro Member' : 'Free Tier'}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-black leading-tight">
              Welcome back, <br />
              <span className="font-serif italic text-orange-500 font-normal">{firstName}</span> 👋
            </h1>
            <p className="text-zinc-400 text-base font-medium mt-3 max-w-lg">
              Create a new AI coach or continue learning with your existing ones.
            </p>
          </div>

          {/* Create Coach Form */}
          <div id="coach-form" className="scroll-mt-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-200 via-amber-200 to-orange-200 rounded-[2.6rem] blur opacity-20 group-hover:opacity-35 transition duration-500" />
              
              <Card className="relative bg-white border-zinc-200/80 rounded-[2.5rem] shadow-xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
                <CardContent className="p-6 md:p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">Create New Coach</h2>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Define your AI tutor</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCoach} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Coach Name *</Label>
                        <div className="relative group/input">
                          <Input 
                            placeholder="e.g. Physics Maven" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-50/80 border-zinc-200 rounded-xl py-5 focus:ring-orange-500/20 focus:border-orange-300 font-semibold placeholder:text-zinc-300 h-12 text-zinc-900 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Topic *</Label>
                        <div className="relative group/input">
                          <Input 
                            placeholder="e.g. Assam History" 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="bg-zinc-50/80 border-zinc-200 rounded-xl py-5 focus:ring-orange-500/20 focus:border-orange-300 font-semibold placeholder:text-zinc-300 h-12 text-zinc-900 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-orange-400" /> Target Language
                      </Label>
                      <div className="w-full bg-zinc-50/80 border border-zinc-200 rounded-xl h-12 px-4 flex items-center justify-between">
                        <span className="font-semibold text-zinc-800 capitalize text-sm">
                          {(() => {
                            const langMap: Record<string, string> = {
                              assamese: 'অসমীয়া (Assamese)',
                              bengali: 'বাংলা (Bengali)',
                              hindi: 'हिन्दी (Hindi)',
                              english: 'English',
                              bodo: 'बड़ो (Bodo)',
                            }
                            return langMap[language] || language || 'Not set'
                          })()}
                        </span>
                        <Link href="/profile" className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors whitespace-nowrap">
                          Change →
                        </Link>
                      </div>
                      <p className="text-[10px] text-zinc-400 ml-1">
                        This is set from your profile.{' '}
                        <Link href="/profile" className="text-orange-500 hover:text-orange-600 font-bold underline underline-offset-2 transition-colors">
                          Go to Profile
                        </Link>{' '}to change your language.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-zinc-100">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-300 ml-1 flex items-center gap-1.5">
                          <School className="w-3 h-3" /> Class (Optional)
                        </Label>
                        <Input 
                          placeholder="e.g. Class 12" 
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          className="bg-zinc-50/50 border-zinc-100 rounded-xl font-semibold h-11 text-zinc-900 placeholder:text-zinc-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-300 ml-1 flex items-center gap-1.5">
                          <GraduationCap className="w-3 h-3" /> Exam (Optional)
                        </Label>
                        <Input 
                          placeholder="e.g. JEE Mains" 
                          value={examName}
                          onChange={(e) => setExamName(e.target.value)}
                          className="bg-zinc-50/50 border-zinc-100 rounded-xl font-semibold h-11 text-zinc-900 placeholder:text-zinc-300"
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
                      className={`group/upload relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                        pdfFile ? "border-orange-300 bg-orange-50/50" : "border-zinc-200 hover:border-orange-300 hover:bg-orange-50/30"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className={`w-6 h-6 mb-1.5 transition-all ${pdfFile ? "text-orange-500" : "text-zinc-300 group-hover/upload:text-orange-400"}`} />
                      <p className={`text-sm font-bold ${pdfFile ? "text-orange-600" : "text-zinc-400"}`}>
                        {pdfFile ? pdfFile.name : "Upload PDF / Textbook (Optional)"}
                      </p>
                      <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-widest font-black">
                        {pdfFile ? "PDF Attached" : "Click to browse"}
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={creating}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white h-14 rounded-2xl text-base font-black shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all border-0"
                    >
                      {creating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Create Coach
                          <ChevronRight className="w-5 h-5 ml-1" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Referral Section */}
          <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-3xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-1">Refer & Earn</p>
                <p className="text-zinc-500 text-sm">Share your code to earn extra credits!</p>
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-orange-200 shadow-sm">
                <span className="text-lg font-black tracking-widest italic text-zinc-900 font-mono">{userProfile?.referral_code ?? '—'}</span>
                <button 
                  className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                  onClick={() => {
                    const code = userProfile?.referral_code;
                    if (!code) return;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(code).then(
                        () => toast.success("Copied!"),
                        () => toast.error("Failed to copy")
                      );
                    } else {
                      toast.error("Clipboard not available");
                    }
                  }}
                >
                  <Copy className="w-4 h-4 text-orange-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Alert */}
      <AlertDialog open={showLimitAlert} onOpenChange={setShowLimitAlert}>
        <AlertDialogContent className="bg-white border-zinc-200 text-zinc-900 rounded-[2rem] p-8 max-w-md">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">
              Upgrade to <span className="font-serif italic text-orange-500">Pro</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 font-medium text-base leading-relaxed">
              You&apos;ve used all your credits. Upgrade to create up to <strong className="text-zinc-800">20 coaches</strong> with voice coaching and more!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <AlertDialogCancel className="bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 rounded-xl h-12 font-bold">
              Maybe Later
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => router.push('/#pricing')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 rounded-xl h-12 font-black text-base px-8 shadow-xl shadow-orange-500/20 border-0"
            >
              Get Prep Pass ₹199
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
