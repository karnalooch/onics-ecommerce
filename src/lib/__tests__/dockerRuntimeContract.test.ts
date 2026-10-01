import fs from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

function dockerBootstrapState(users: unknown[]) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "celtronics-docker-bootstrap-")
  )
  const dbPath = path.join(tempDir, "db.json")

  try {
    fs.writeFileSync(dbPath, JSON.stringify({ users }))
    const result = spawnSync(
      process.execPath,
      ["scripts/docker/bootstrap-state.cjs"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CELTRONICS_DB_PATH: dbPath,
        },
        encoding: "utf8",
      }
    )

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    return result.stdout.trim()
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
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

  it("uses the same non-empty password-hash semantics for Docker bootstrap", () => {
    const dockerfile = read("Dockerfile")
    const entrypoint = read("scripts/docker/entrypoint.sh")

    expect(dockerfile).toContain("bootstrap-state.cjs")
    expect(entrypoint).toContain("node /app/bootstrap-state.cjs")

    expect(
      dockerBootstrapState([
        { roleType: "ADMIN", isBlocked: false },
      ])
    ).toBe("yes")
    expect(
      dockerBootstrapState([
        { roleType: "ADMIN", isBlocked: false, passwordHash: "" },
      ])
    ).toBe("yes")
    expect(
      dockerBootstrapState([
        {
          roleType: "ADMIN",
          isBlocked: false,
          passwordHash: "$2b$12$sealed",
        },
      ])
    ).toBe("no")
    expect(
      dockerBootstrapState([
        { roleType: "ADMIN", isBlocked: true },
      ])
    ).toBe("no")
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

describe("production edge runtime contract", () => {
  it("keeps the application private behind the Caddy edge", () => {
    const compose = read("docker-compose.production.yml")
    const appStart = compose.indexOf("  celtronics:")
    const edgeStart = compose.indexOf("  caddy:")
    const appBlock = compose.slice(appStart, edgeStart)

    expect(appStart).toBeGreaterThanOrEqual(0)
    expect(edgeStart).toBeGreaterThan(appStart)
    expect(appBlock).toContain('CELTRONICS_RUNTIME_PROFILE: "production"')
    expect(appBlock).toContain('expose:')
    expect(appBlock).not.toContain("\n    ports:")
    expect(compose).toContain('image: caddy:2.11.4-alpine')
    expect(compose).toContain('"80:80"')
    expect(compose).toContain('"443:443"')
  })

  it("requires explicit production secrets instead of generating them", () => {
    const compose = read("docker-compose.production.yml")
    const entrypoint = read("scripts/docker/entrypoint.sh")

    expect(compose).toContain('AUTH_SECRET: "${AUTH_SECRET:?Set AUTH_SECRET}"')
    expect(compose).toContain(
      'NEXTAUTH_SECRET: "${NEXTAUTH_SECRET:?Set NEXTAUTH_SECRET}"'
    )
    expect(entrypoint).toContain(
      'if [ "$RUNTIME_PROFILE" = "production" ]; then'
    )
    expect(entrypoint).toContain(
      "AUTH_SECRET and NEXTAUTH_SECRET are required in production runtime profile"
    )
    expect(entrypoint).toContain(
      "ADMIN_BOOTSTRAP_PASSWORD is required until the active admin is sealed"
    )
  })

  it("pins durable production storage and does not use the repository filesystem", () => {
    const compose = read("docker-compose.production.yml")

    expect(compose).toContain(
      'source: "${CELTRONICS_DATA_ROOT:?Set CELTRONICS_DATA_ROOT}"'
    )
    expect(compose).toContain("target: /app/var/celtronics")
    expect(compose).toContain(
      'CELTRONICS_DB_PATH: "/app/var/celtronics/db.json"'
    )
    expect(compose).toContain(
      'CELTRONICS_UPLOAD_ROOT: "/app/var/celtronics/uploads"'
    )
  })

  it("sanitizes client-controlled identity headers at the edge", () => {
    const caddyfile = read("Caddyfile.production")

    expect(caddyfile).toContain("header_up -CF-Connecting-IP")
    expect(caddyfile).toContain("header_up X-Real-IP {remote_host}")
    expect(caddyfile).toContain("reverse_proxy celtronics:3001")
  })
})
