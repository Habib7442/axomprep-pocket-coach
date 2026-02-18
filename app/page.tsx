import Link from "next/link";
import { ArrowRight, MessageSquare, Zap, BookOpen } from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30 font-sans">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <main className="relative z-10 flex flex-col items-center justify-center pt-48 pb-12 px-6">
        {/* Hero Content */}
        <div className="max-w-4xl text-center space-y-12">
          {/* Badge Removed */}
          
          <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-foreground">
            Design Your <span className="font-serif italic text-primary">Perfect</span> <br /> 
            AI Pocket Coach
          </h1>

          <p className="max-w-xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            Learn anything with personalized AI support. 
            Snap a photo of any question or note and get instant explanations in <span className="text-foreground">your native language</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <SignedIn>
              <Link 
                href="/dashboard" 
                className="group relative flex items-center gap-2 px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/30"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="group relative flex items-center gap-2 px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/30">
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </SignInButton>
            </SignedOut>
            <button className="px-10 py-5 rounded-2xl border border-border bg-secondary/20 text-foreground font-black backdrop-blur-sm transition-all hover:bg-secondary/40">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mt-56 w-full">
          {[
            {
              icon: <Zap className="w-6 h-6 text-primary" />,
              title: "Instant Solving",
              description: "Upload any question from your textbook and get a step-by-step solution instantly."
            },
            {
              icon: <MessageSquare className="w-6 h-6 text-primary" />,
              title: "Voice Notes",
              description: "Concepts explained in voice notes in your native language for deeper understanding."
            },
            {
              icon: <BookOpen className="w-6 h-6 text-primary" />,
              title: "Smart Suggestions",
              description: "AI-curated 'Most Probable' questions and rapid-fire MCQ sets for any subject."
            }
          ].map((feature, idx) => (
            <div key={idx} className="p-12 rounded-[3rem] border border-border/50 bg-card/20 backdrop-blur-3xl hover:border-primary/50 transition-all hover:-translate-y-3 group">
              <div className="w-16 h-16 rounded-[1.5rem] bg-secondary/30 flex items-center justify-center mb-10 group-hover:bg-primary/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium text-lg">{feature.description}</p>
            </div>
          ))}
        </div>
        
        {/* Feature Grid End */}

        {/* Pricing Section */}
        <div id="pricing" className="max-w-4xl mx-auto mt-56 w-full text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Everything you need to <span className="font-serif italic text-primary">Ace</span> 2026.</h2>
            <p className="text-muted-foreground text-lg font-medium">One simple plan. Unlimited potential.</p>
          </div>

          <div className="relative group">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary-foreground/50 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative p-12 md:p-16 rounded-[3rem] border border-primary/20 bg-zinc-950 flex flex-col items-center gap-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Ultimate Prep Pass</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl md:text-8xl font-black tracking-tighter">₹199</span>
                  <span className="text-zinc-500 font-bold">/mo</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-left w-full max-w-xl py-8 border-y border-zinc-900">
                {[
                  "Unlimited AI Chat & Solving",
                  "24/7 Voice Coaching",
                  "2026 Guess Papers Access",
                  "Interactive Infographics",
                  "Ad-Free Premium Experience",
                  "Early Access to OMR Sets"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    <span className="text-sm font-bold text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>

              <button disabled className="w-full md:w-auto px-16 py-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs transition-all opacity-50 cursor-not-allowed">
                Coming Soon
              </button>
              
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Pricing will adjust based on school academic cycles.</p>
            </div>
          </div>
        </div>
        
        {/* End of Main Content */}
      </main>

      <footer className="relative z-10 py-24 px-6 border-t border-border/30 mt-40 bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="text-2xl font-bold tracking-tighter">AXOMPREP</h4>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-medium">
              Empowering students in Assam with AI-driven educational support. 
              Transforming how you study for SEBA and AHSEC exams with cutting-edge technology.
            </p>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold uppercase tracking-widest text-[10px] opacity-50">Product</h5>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">How it Works</Link></li>
              <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold uppercase tracking-widest text-[10px] opacity-50">Support</h5>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refunds" className="hover:text-primary transition-colors">Refund Policy</Link></li>
              <li><a href="mailto:support@axomprep.in" className="hover:text-primary transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">
          <p>© 2026 Axomprep. All rights reserved.</p>
          <p>Created with passion for the future of Assam.</p>
        </div>
      </footer>
    </div>
  );
}
