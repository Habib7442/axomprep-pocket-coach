import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.axomprep.in", 
        "axomprep.in",
        ...(process.env.NODE_ENV === "development" 
          ? ["localhost:3000", "unrealistically-unbungling-milania.ngrok-free.dev"] 
          : [])
      ] as string[]
    }
  },
  async headers() {
    const devUrl = process.env.NODE_ENV === "development" ? " https://unrealistically-unbungling-milania.ngrok-free.dev" : "";
    
    const cspValue = `
      default-src 'self'${devUrl};
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://sdk.hs.dodopayments.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' blob: data: https://*.supabase.co https://lh3.googleusercontent.com;
      frame-src 'self' https://challenges.cloudflare.com https://checkout.dodopayments.com https://test.checkout.dodopayments.com;
      worker-src 'self' blob:;
      connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://api.dodopayments.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com${devUrl};
    `.replace(/\n/g, "").replace(/\s+/g, " ").trim();

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspValue
          }
        ]
      }
    ];
  }
};

export default nextConfig;
