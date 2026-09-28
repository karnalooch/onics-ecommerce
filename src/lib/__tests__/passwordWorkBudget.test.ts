import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  PASSWORD_WORK_MAX_CONCURRENCY,
  PasswordWorkBudget,
  PasswordWorkCapacityError,
} from "@/lib/passwordWorkBudget"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("password work budget", () => {
  it("uses a small process-wide concurrency ceiling", () => {
    expect(PASSWORD_WORK_MAX_CONCURRENCY).toBe(4)
  })

  it("fails closed instead of queueing unbounded password work", async () => {
    const budget = new PasswordWorkBudget(1)
    let release!: () => void
    const blocker = new Promise<void>((resolve) => {
      release = resolve
    })

    const first = budget.run(async () => {
      await blocker
      return "done"
    })

    expect(budget.activeCount).toBe(1)
    await expect(
      budget.run(async () => "second")
    ).rejects.toBeInstanceOf(PasswordWorkCapacityError)

    release()
    await expect(first).resolves.toBe("done")
    expect(budget.activeCount).toBe(0)
  })

  it("releases capacity after failed password work", async () => {
    const budget = new PasswordWorkBudget(1)

    await expect(
      budget.run(async () => {
        throw new Error("HASH_FAILED")
      })
    ).rejects.toThrow("HASH_FAILED")

    expect(budget.activeCount).toBe(0)
    await expect(budget.run(async () => "recovered")).resolves.toBe("recovered")
  })

  it("wires every production bcrypt path through the shared budget", () => {
    const auth = read("src/auth.ts")
    const timing = read("src/lib/loginTiming.ts")
    const bootstrap = read("src/lib/adminBootstrap.ts")
    const register = read("src/app/api/register/route.ts")

    expect(auth).toContain("runPasswordWork(() => bcrypt.compare(")
    expect(auth).toContain("PasswordWorkCapacityError")
    expect(timing).toContain("runPasswordWork(() =>")
    expect(bootstrap).toContain("runPasswordWork(() =>")
    expect(register).toContain("runPasswordWork(() =>")
    expect(register).toContain("error instanceof PasswordWorkCapacityError")
  })
})
