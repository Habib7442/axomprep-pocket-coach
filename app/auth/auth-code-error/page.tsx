import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black italic tracking-tight">Authentication Error</h1>
          <p className="text-zinc-500 font-medium">
            We couldn&apos;t verify your sign-in request. This might happen if the link has expired or was already used.
          </p>
        </div>
        <div className="pt-6">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-black text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
