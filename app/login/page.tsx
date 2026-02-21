'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ArrowRight, Chrome, Eye, EyeOff } from 'lucide-react'
import { login, signup, signInWithGoogle } from './actions'

import { useFormStatus } from 'react-dom'

function SubmitButton({ isSignUp }: { isSignUp: boolean }) {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-black text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
    >
      {pending ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
      <ArrowRight className="w-5 h-5" />
    </button>
  )
}

import { Suspense } from 'react'

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')

  const handleAction = async (formData: FormData) => {
    if (isSignUp) {
      await signup(formData);
    } else {
      await login(formData);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-orange-100/30 via-blue-50/20 to-transparent blur-[120px] -z-10 rounded-full"></div>

      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-black italic">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-zinc-500 font-medium">
            {isSignUp ? 'Start your learning journey' : 'Log in to your pocket coach'}
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-blue-500 to-emerald-500 rounded-[2.6rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="rounded-2xl border-emerald-100 bg-emerald-50/50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription className="font-medium">{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <button
                onClick={() => {
                  signInWithGoogle()
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-zinc-100 bg-white hover:bg-zinc-50 transition-all font-bold group"
              >
                <Chrome className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-zinc-400">
                  <span className="bg-white px-4 tracking-widest">Or continue with email</span>
                </div>
              </div>

              <form action={handleAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 border-2 border-transparent focus:border-black focus:bg-white outline-none transition-all font-medium focus:ring-4 focus:ring-black/5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">Password</label>
                  <div className="relative group/pass">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full px-6 py-4 pr-14 rounded-2xl bg-zinc-50 border-2 border-transparent focus:border-black focus:bg-white outline-none transition-all font-medium focus:ring-4 focus:ring-black/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <SubmitButton isSignUp={isSignUp} />
              </form>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-500 font-medium pb-8">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-black font-black hover:underline"
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center font-black italic text-4xl animate-pulse">AXOMPREP...</div>}>
      <LoginForm />
    </Suspense>
  )
}
