import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/approve": ["./public/images/*-email.png"],
    "/api/super-admin/retry": ["./public/images/*-email.png"],
  },
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Cache-Control", value: "no-store" },
    ];
    return ["/admin", "/gate", "/super-admin", "/api/super-admin/:path*", "/staff/:path*", "/api/admin/:path*", "/api/gate/:path*", "/api/staff/:path*"].map(source => ({ source, headers }));
  },
};

export default nextConfig;
