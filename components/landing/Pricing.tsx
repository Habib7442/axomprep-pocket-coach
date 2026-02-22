"use client";

import PricingButton from "@/components/checkout/PricingButton";
import { Check } from "lucide-react";

const features = [
  "Unlimited AI Voice Coach",
  "Audio Stories & Podcasts",
  "Smart Knowledge Quizzes",
  "Specialized for All Exams",
  "Instant Doubt Solving",
  "Native Language Support"
];

export default function Pricing() {
  const currentYear = new Date().getFullYear();

  return (
    <section id="pricing" className="py-20 md:py-32 px-4 md:px-6">
      <div className="max-w-5xl mx-auto rounded-[2.5rem] md:rounded-[4rem] bg-black text-white p-8 md:p-24 relative overflow-hidden">
        {/* Decorative Background for Dark Card */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-8 md:space-y-10">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500 italic">The Ultimate Prep Pass</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-tight">
                Everything you need to <span className="font-serif italic text-zinc-400 font-normal">Ace</span> {currentYear}.
              </h2>
            </div>
            
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-md font-medium">
              Get full access to all AI features, premium study materials, 
              and exclusive exam predictions for a single price.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 md:gap-y-6">
              {features.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs md:text-sm font-bold text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-orange-500" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-12 flex flex-col items-center gap-8 md:gap-10 text-center">
             <div className="space-y-2">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Monthly Plan</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl md:text-7xl font-black tracking-tighter text-white">₹199</span>
                  <span className="text-zinc-500 font-bold text-lg md:text-xl">/mo</span>
                </div>
             </div>

             <div className="w-full space-y-6">
              {process.env.NEXT_PUBLIC_DODO_PRODUCT_ID ? (
                  <PricingButton productId={process.env.NEXT_PUBLIC_DODO_PRODUCT_ID} />
                ) : (
                  <button 
                    disabled 
                    className="w-full py-4 rounded-full bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs transition-all opacity-50 cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
                
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Cancel anytime. Pricing will adjust based on <br /> school academic cycles.
                </p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
