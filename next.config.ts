import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.axomprep.in", "axomprep.in"]
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.axomprep.in https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
