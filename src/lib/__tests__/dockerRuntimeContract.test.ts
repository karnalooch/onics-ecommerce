import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("local Docker runtime contract", () => {
  it("builds Next.js as a standalone server", () => {
    const config = read("next.config.ts")
    const dockerfile = read("Dockerfile")

    expect(config).toContain('output: "standalone"')
    expect(dockerfile).toContain("/app/.next/standalone")
    expect(dockerfile).toContain("ENTRYPOINT")
  })

  it("keeps the default Compose runtime local-only and durable", () => {
    const compose = read("compose.yaml")

    expect(compose).toContain('"127.0.0.1:${CELTRONICS_PORT:-3100}:3001"')
    expect(compose).toContain(
      "celtronics-data:/app/var/celtronics"
    )
    expect(compose).toContain(
      'CELTRONICS_PUBLIC_URL: "http://localhost:${CELTRONICS_PORT:-3100}"'
    )
    expect(compose).toContain("/api/health/ready")
    expect(compose).toContain("no-new-privileges:true")
    expect(compose).toContain("cap_drop:")
  })

  it("defends the Docker entrypoint against Windows CRLF checkout", () => {
    const attributes = read(".gitattributes")
    const dockerfile = read("Dockerfile")

    expect(attributes).toContain("*.sh text eol=lf")
    expect(dockerfile).toContain("sed -i 's/\\r$//' /app/docker-entrypoint.sh")
  })

  it("runs the application as a non-root user", () => {
    const dockerfile = read("Dockerfile")

    expect(dockerfile).toContain("USER node")
    expect(dockerfile).not.toContain("USER root")
  })

  it("seeds persistent storage only when the database is absent", () => {
    const entrypoint = read("scripts/docker/entrypoint.sh")

    expect(entrypoint).toContain('if [ ! -e "$DB_PATH" ]; then')
    expect(entrypoint).toContain("cp /app/seed/db.json")
    expect(entrypoint).toContain("db.paymentControl = {")
    expect(entrypoint).toContain("enabled: false")
    expect(entrypoint).not.toContain("rm -f \"$DB_PATH\"")
  })

  it("generates local runtime secrets instead of committing them", () => {
    const compose = read("compose.yaml")
    const entrypoint = read("scripts/docker/entrypoint.sh")

    expect(compose).not.toContain("AUTH_SECRET:")
    expect(compose).not.toContain("NEXTAUTH_SECRET:")
    expect(entrypoint).toContain("randomBytes(48)")
    expect(entrypoint).toContain(".auth-secret")
    expect(entrypoint).toContain(".nextauth-secret")
  })
})
