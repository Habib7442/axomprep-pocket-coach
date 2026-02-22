import Link from "next/link";
import { ArrowRight, LayoutDashboard, Menu } from "lucide-react";
import { User } from "@supabase/supabase-js";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6">
      <div className="w-full max-w-6xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img 
            src="/logo.png" 
            alt="AXOMPREP" 
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-contain"
          />
          <span className="font-bold tracking-tighter text-lg md:text-xl text-black hidden sm:block">AXOMPREP</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">Features</Link>
          <Link href="/testimonials" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">Testimonials</Link>
          <Link href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">Pricing</Link>
          <Link href="#about" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">About</Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="flex items-center gap-2 text-xs md:text-sm font-bold bg-black text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10">
                <LayoutDashboard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Go to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-xs md:text-sm font-bold text-black border border-black/10 px-4 md:px-5 py-2 rounded-full hover:bg-black/5 transition-colors">
                  Log In
                </Link>
                <Link href="/login" className="hidden sm:flex items-center gap-2 text-sm font-bold bg-black text-white px-5 py-2 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors">
                <Menu className="w-5 h-5 text-zinc-600" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white/95 backdrop-blur-xl border-l border-zinc-100 p-0">
              <SheetHeader className="p-6 border-b border-zinc-100">
                <SheetTitle className="flex items-center gap-2 font-black tracking-tighter text-xl">
                  <img src="/logo.png" className="w-6 h-6 object-contain" alt="" />
                  AXOMPREP
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col p-6 gap-6">
                <Link href="#features" className="text-sm font-bold text-zinc-500 hover:text-orange-500 transition-colors uppercase tracking-widest">Features</Link>
                <Link href="/testimonials" className="text-sm font-bold text-zinc-500 hover:text-orange-500 transition-colors uppercase tracking-widest">Testimonials</Link>
                <Link href="#pricing" className="text-sm font-bold text-zinc-500 hover:text-orange-500 transition-colors uppercase tracking-widest">Pricing</Link>
                <Link href="#about" className="text-sm font-bold text-zinc-500 hover:text-orange-500 transition-colors uppercase tracking-widest">About</Link>
                <div className="pt-6 border-t border-zinc-100 flex flex-col gap-3">
                  {user ? (
                    <Link href="/dashboard" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-black text-white font-bold text-sm">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="w-full py-4 rounded-2xl bg-zinc-50 text-black font-bold text-sm text-center border border-zinc-100">
                        Log In
                      </Link>
                      <Link href="/login" className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm text-center shadow-lg shadow-orange-500/20">
                        Get Started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
