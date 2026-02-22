"use client";

import { Mic, Volume2, BrainCircuit, ArrowUpRight } from "lucide-react";

const features = [
  {
    icon: <Mic className="w-8 h-8 text-orange-600" />,
    title: "Native Voice Coach",
    description: "Hands-free, real-time voice conversations natively in Assamese and English. Feels like a real private tutor from Assam.",
    bg: "bg-orange-50/50",
    border: "border-orange-100"
  },
  {
    icon: <Volume2 className="w-8 h-8 text-indigo-600" />,
    title: "Universal Learning",
    description: "Create an AI coach for any niche — from school exams to coding or music. Learn anything you want, effortlessly.",
    bg: "bg-indigo-50/50",
    border: "border-indigo-100"
  },
  {
    icon: <BrainCircuit className="w-8 h-8 text-amber-600" />,
    title: "Smart Local Context",
    description: "AI that understands the context of Assam's education system while providing global-standard knowledge tools.",
    bg: "bg-amber-50/50",
    border: "border-amber-100"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-20">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-black leading-tight">
          Education that fits <br />
          <span className="font-serif italic text-zinc-400 font-normal">in your pocket.</span>
        </h2>
        <p className="text-lg text-zinc-500 font-medium">
          We built Axomprep to be more than just a tool. It's your personal guide 
          to mastering any subject, anytime, anywhere.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {features.map((feature, idx) => (
          <div 
            key={idx} 
            tabIndex={0}
            className={`group p-8 rounded-[2rem] border ${feature.border} ${feature.bg} flex flex-col items-start gap-6 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/5 focus:outline-none focus:ring-4 focus:ring-black/5 focus:-translate-y-2 focus:shadow-2xl focus:shadow-black/5`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl shadow-black/5 flex items-center justify-center group-hover:scale-110 group-focus:scale-110 transition-transform duration-500">
              {/* Scale down the icons slightly */}
              <div className="scale-75">
                {feature.icon}
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-black tracking-tight">{feature.title}</h3>
              <p className="text-base text-zinc-600 leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>

            <div className="mt-auto pt-2 flex items-center gap-2 text-black font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true">
              Explore
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
