import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LegalWrapperProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalWrapper({ title, lastUpdated, children }: LegalWrapperProps) {
  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-24 px-6 md:px-12 selection:bg-primary/30 font-sans text-zinc-300">
      <div className="max-w-4xl mx-auto space-y-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Home
        </Link>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">
            {title}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-invert max-w-none 
          prose-h2:text-white prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:tracking-tight prose-h2:font-bold
          prose-p:leading-relaxed prose-p:mb-6 prose-p:text-zinc-400
          prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2 prose-li:text-zinc-400
        ">
          {children}
        </div>
      </div>
    </div>
  );
}
