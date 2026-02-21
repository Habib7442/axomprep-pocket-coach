import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000", 
        "*.axomprep.in", 
        "axomprep.in", 
        "unrealistically-unbungling-milania.ngrok-free.dev"
      ]
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' https://unrealistically-unbungling-milania.ngrok-free.dev; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.axomprep.in https://accounts.axomprep.in https://challenges.cloudflare.com https://sdk.hs.dodopayments.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https://*.supabase.co https://lh3.googleusercontent.com; frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://checkout.dodopayments.com https://test.checkout.dodopayments.com; worker-src 'self' blob:; connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev https://clerk.axomprep.in https://accounts.axomprep.in https://challenges.cloudflare.com https://api.dodopayments.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://unrealistically-unbungling-milania.ngrok-free.dev;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
