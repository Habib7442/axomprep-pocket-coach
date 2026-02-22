"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Send, CheckCircle2 } from "lucide-react";
import { submitTestimonial } from "@/lib/actions";
import { toast } from "sonner";

export default function TestimonialsPage() {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    content: "",
    rating: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
        const result = await submitTestimonial(formData);
      if (result.success) {
        setIsSubmitted(true);
        toast.success("Thank you! Your testimonial has been submitted for review.");
        setFormData({ name: "", role: "", content: "", rating: 5 });
      } else {
        console.error("Testimonial submission failed:", result.error);
        toast.error("Submission failed. Please try again later.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-100/50 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 blur-[120px] rounded-full"></div>
      </div>

      <nav className="p-6 md:p-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <div className="space-y-12">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-black leading-tight">
              Share your <br />
              <span className="font-serif italic text-orange-500 font-normal">Success Story.</span>
            </h1>
            <p className="text-lg text-zinc-500 font-medium leading-relaxed max-w-md mx-auto">
              Your feedback helps us make Axomprep better for every student. 
              Let us know how your AI pocket coach is helping you.
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
            {isSubmitted ? (
              <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-black">Thank you so much!</h3>
                  <p className="text-zinc-600 font-medium tracking-tight">
                    Your story has been received. Our team will review and publish it soon.
                  </p>
                </div>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="px-8 py-3 rounded-full bg-black text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                >
                  Write another one
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Full Name *</label>
                    <input 
                       required
                       id="name"
                       type="text" 
                       placeholder="e.g. Rahul Das"
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-zinc-200 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm font-medium"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="role" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Role (Optional)</label>
                    <input 
                      id="role"
                      type="text" 
                      placeholder="e.g. Student, SEBA 2026"
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-zinc-200 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm font-medium"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Your Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                          formData.rating >= star 
                            ? "bg-amber-50 border-amber-200 text-amber-500 shadow-sm" 
                            : "bg-white border-zinc-200 text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        <Star className={`w-5 h-5 ${formData.rating >= star ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="content" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Your Story *</label>
                  <textarea 
                    required
                    id="content"
                    placeholder="Tell us how Axomprep helps you learn..."
                    rows={5}
                    className="w-full px-5 py-4 rounded-3xl bg-white border border-zinc-200 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm font-medium resize-none"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-5 rounded-full bg-black text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait shadow-xl shadow-black/10"
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      Submit Testimonial
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
