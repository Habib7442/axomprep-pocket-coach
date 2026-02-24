import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
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
  metadataBase: new URL("https://axomprep.in"),
  title: "Axomprep | Create Pocket Coaches in Assam Native Language",
  description: "The first universal AI coaching platform built for Assam. Learn anything instantly in your native language. Create custom AI coaches for any niche, from academic subjects to professional skills, with full Assamese and English support. Powered by Gemini.",
  keywords: [
    "AI coach Assam",
    "Assamese AI tutor", 
    "learn in Assamese",
    "personalized learning Assam", 
    "doubt solving app", 
    "SEBA AI support",
    "AHSEC AI coach",
    "create custom AI coach", 
    "native language education AI"
  ],
  authors: [{ name: "Axomprep Team" }],
  openGraph: {
    title: "Axomprep | Create Pocket Coaches in Assam Native Language",
    description: "Learn at your own pace in your own language. Create custom AI coaches and master any topic with Assam's first native-support AI platform. Powered by Gemini.",
    url: "https://axomprep.in",
    siteName: "Axomprep",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Axomprep - Universal AI Learning with Native Assamese Support",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axomprep | Create Pocket Coaches in Assam Native Language",
    description: "Master any subject with custom AI coaches that speak your language. Powered by Gemini.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AxomPrep",
  },
};

import { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
