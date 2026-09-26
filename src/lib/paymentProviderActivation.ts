import {
  resolvePrzelewy24Config,
  testPrzelewy24Access,
} from "@/lib/przelewy24"
import type { PaymentProviderId } from "@/lib/paymentProviders"

export type PaymentProviderActivationFailure =
  | "CREDENTIALS_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "ACCESS_REJECTED"

export type PaymentProviderActivationPreflightResult =
  | { checked: false; ok: true }
  | { checked: true; ok: true }
  | {
      checked: true
      ok: false
      reason: PaymentProviderActivationFailure
    }

type PaymentProviderActivationProbe = () => Promise<void>

const activationProbes: Partial<
  Record<PaymentProviderId, PaymentProviderActivationProbe>
> = {
  PRZELEWY24: async () => {
    const config = resolvePrzelewy24Config()
    await testPrzelewy24Access(config)
  },
}

function activationFailure(error: unknown): PaymentProviderActivationFailure {
  const code = error instanceof Error ? error.message : ""

  if (code === "PRZELEWY24_ACCESS_UNAUTHORIZED") {
    return "CREDENTIALS_REJECTED"
  }
  if (code === "PRZELEWY24_ACCESS_UNAVAILABLE") {
    return "PROVIDER_UNAVAILABLE"
  }
  return "ACCESS_REJECTED"
}

export async function runPaymentProviderActivationPreflight(
  provider: PaymentProviderId
): Promise<PaymentProviderActivationPreflightResult> {
  const probe = activationProbes[provider]
  if (!probe) {
    return { checked: false, ok: true }
  }

  try {
    await probe()
    return { checked: true, ok: true }
  } catch (error) {
    return {
      checked: true,
      ok: false,
      reason: activationFailure(error),
    }
  }
}
