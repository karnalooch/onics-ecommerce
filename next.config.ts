import type { NextConfig } from "next"
import { getSecurityHeaders } from "./src/lib/securityHeaders"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [],
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 0,
    maximumResponseBody: 5_000_000,
    qualities: [75],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ]
  },
}

export default nextConfig
