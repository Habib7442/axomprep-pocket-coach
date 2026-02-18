import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Axomprep | 24/7 AI Pocket Coach for SEBA & AHSEC",
    template: "%s | Axomprep"
  },
  description: "Master SEBA & AHSEC board exams with Axomprep. Instant AI doubt solving in Assamese & English, high-probability questions, and OMR practice sets for 2026 exams.",
  keywords: ["SEBA Prep", "AHSEC Prep", "Assamese AI", "Exam Suggestions", "Science Doubt Solver", "Assam Board Exams", "Axomprep"],
  authors: [{ name: "Axomprep Team" }],
  openGraph: {
    title: "Axomprep | 24/7 AI Pocket Coach",
    description: "The smartest way to master your board exams in Assam. Instant solutions in Assamese & English.",
    url: "https://axomprep.in",
    siteName: "Axomprep",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axomprep | AI Pocket Coach",
    description: "Instant doubt solving and probable questions for SEBA & AHSEC students.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased selection:bg-primary/30`}
          suppressHydrationWarning
        >
          <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 md:px-8 py-4 md:py-6 backdrop-blur-md bg-black/50 border-b border-zinc-900">
            <div className="flex items-center gap-4">
              <div id="navbar-left-slot" className="md:hidden"></div>
              <Link href="/" className="text-xl font-black tracking-tighter hover:opacity-80 transition-opacity">
                AXOMPREP
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-zinc-400 hover:text-white transition-colors">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-bold">Join Now</button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
