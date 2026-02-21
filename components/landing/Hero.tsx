import Link from "next/link";
import { ArrowRight, Sparkles, BrainCircuit, Play, LayoutDashboard } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface HeroProps {
  user: User | null;
}

export default function Hero({ user }: HeroProps) {
  return (
    <section className="relative pt-24 md:pt-40 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-orange-100/50 via-blue-50/30 to-transparent blur-[120px] -z-10 rounded-full"></div>
      
      <div className="max-w-4xl space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/5 text-xs font-bold uppercase tracking-widest text-zinc-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Sparkles className="w-3 h-3 text-orange-500" />
          Your Smartest AI Study Companion
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] text-black animate-in fade-in slide-in-from-bottom-8 duration-700">
          Design Your <span className="font-serif italic text-orange-500 font-normal">Perfect</span> <br />
          AI Pocket Coach
        </h1>

        <p className="max-w-xl mx-auto text-lg md:text-xl text-zinc-500 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000">
          Learn anything with personalized AI support. 
          Snap a photo of any question or note and get instant explanations in <span className="text-black font-bold underline decoration-orange-500/30">your native language</span>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 animate-in fade-in slide-in-from-bottom-16 duration-1000">
          <Link 
            href={user ? "/dashboard" : "/login"} 
            className="group relative flex items-center justify-center w-full sm:w-auto gap-2 px-10 py-4 rounded-full bg-black text-white font-black text-base transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/20"
          >
            {user ? (
              <>
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </>
            ) : (
              <>
                Start Learning
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Link>
        </div>
      </div>

    </section>
  );
}
