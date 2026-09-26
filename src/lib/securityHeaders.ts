export type SecurityHeader = {
  key: string
  value: string
}

const BASE_SECURITY_HEADERS: SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
]

export function getSecurityHeaders(nodeEnv = process.env.NODE_ENV) {
  const headers = BASE_SECURITY_HEADERS.map((header) => ({ ...header }))

  if (nodeEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    })
  }

  return headers
}
