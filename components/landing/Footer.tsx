"use client";

import Link from "next/link";
import { Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-24 px-6 border-t border-zinc-100 bg-zinc-50/50">
      <div className="max-w-7xl mx-auto space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2 space-y-8">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="AXOMPREP" 
                className="w-10 h-10 rounded-xl object-contain"
              />
              <span className="font-bold tracking-tighter text-2xl text-black">AXOMPREP</span>
            </div>
            <p className="text-zinc-500 text-lg max-w-sm leading-relaxed font-medium">
              Empowering students in Assam with AI-driven educational support. 
              Transforming how you study for SEBA and AHSEC exams with cutting-edge technology.
            </p>
            <div className="flex gap-4">
               <a 
                 href="https://www.instagram.com/axom_prep?igsh=N3FzaG5nbWRoMGtj" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 hover:text-pink-600 transition-all cursor-pointer shadow-sm active:scale-95"
                 title="Follow us on Instagram"
               >
                 <Instagram className="w-5 h-5" />
               </a>
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="font-bold uppercase tracking-[0.2em] text-[10px] text-black">Product</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-bold">
              <li><Link href="/dashboard" className="hover:text-black transition-colors">Dashboard</Link></li>
              <li><Link href="/testimonials" className="hover:text-black transition-colors">Testimonials</Link></li>
              <li><Link href="#features" className="hover:text-black transition-colors">How it Works</Link></li>
              <li><Link href="#pricing" className="hover:text-black transition-colors">Pricing</Link></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h5 className="font-bold uppercase tracking-[0.2em] text-[10px] text-black">Support</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-bold">
              <li><Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refunds" className="hover:text-black transition-colors">Refund Policy</Link></li>
              <li><a href="mailto:support@axomprep.in" className="hover:text-black transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
            © 2026 Axomprep. All rights reserved.
          </p>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Created for the future of Assam.
          </p>
        </div>
      </div>
    </footer>
  );
}
