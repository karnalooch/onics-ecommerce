import { describe, expect, it } from "vitest"
import {
  buildPaymentControlStateToken,
  buildPaymentMethodStateToken,
  isGlobalPaymentSettingsReplay,
  isMethodPaymentSettingsReplay,
} from "@/lib/paymentSettingsState"

describe("payment settings state fencing", () => {
  it("changes the global token whenever emergency-relevant control state changes", () => {
    const current = {
      enabled: true,
      maintenanceMessage: null,
      updatedAt: "2026-09-27T08:00:00.000Z",
    }
    const token = buildPaymentControlStateToken(current)

    expect(
      buildPaymentControlStateToken({ ...current, enabled: false })
    ).not.toBe(token)
    expect(
      buildPaymentControlStateToken({
        ...current,
        maintenanceMessage: "Awaria",
      })
    ).not.toBe(token)
    expect(
      buildPaymentControlStateToken({
        ...current,
        updatedAt: "2026-09-27T08:01:00.000Z",
      })
    ).not.toBe(token)
  })

  it("keeps tokens stable across object key insertion order", () => {
    expect(
      buildPaymentMethodStateToken({
        enabled: true,
        displayName: "Stripe",
        displayOrder: 1,
        maintenanceMessage: null,
        updatedAt: null,
      })
    ).toBe(
      buildPaymentMethodStateToken({
        updatedAt: null,
        maintenanceMessage: null,
        displayOrder: 1,
        displayName: "Stripe",
        enabled: true,
      })
    )
  })

  it("recognizes exact global retries but not an attempted re-enable after shutdown", () => {
    const shutdown = {
      enabled: false,
      maintenanceMessage: "Awaria",
    }

    expect(
      isGlobalPaymentSettingsReplay(shutdown, {
        enabled: false,
        maintenanceMessage: "Awaria",
      })
    ).toBe(true)
    expect(
      isGlobalPaymentSettingsReplay(shutdown, {
        enabled: true,
        maintenanceMessage: null,
      })
    ).toBe(false)
  })

  it("treats method writes as partial updates for replay detection", () => {
    const current = {
      enabled: true,
      displayName: "Stripe",
      displayOrder: 1,
      maintenanceMessage: null,
    }

    expect(
      isMethodPaymentSettingsReplay(current, {
        enabled: true,
      })
    ).toBe(true)
    expect(
      isMethodPaymentSettingsReplay(current, {
        displayName: "Stripe",
        displayOrder: 1,
        maintenanceMessage: null,
      })
    ).toBe(true)
    expect(
      isMethodPaymentSettingsReplay(current, {
        enabled: false,
      })
    ).toBe(false)
  })
})
