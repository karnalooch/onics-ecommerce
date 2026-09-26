import Stripe from "stripe"
import { resolveCartItems } from "@/lib/commerce"
import {
  moneyToMinorUnits,
  resolveBankTransferConfig,
  resolveStripeCheckoutConfig,
} from "@/lib/payments"
import {
  isPaymentControlEnabled,
  isPaymentMethodEnabled,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import {
  applyOrderInventoryTransition,
  reserveInventory,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import {
  initializeMockData,
  mutateMockData,
  type PaymentControlSettings,
  type PaymentMethodSettings,
} from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  assertPaymentProviderCapability,
} from "@/lib/paymentProviders"
import {
  registerPrzelewy24Transaction,
  resolvePrzelewy24Config,
} from "@/lib/przelewy24"

export type PaymentCheckoutItem = {
  id: string
  quantity: number
}

export type PaymentCheckoutSessionUser = {
  id?: string
  email?: string | null
  role?: string
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  nip?: string | null
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number
}

type PaymentCheckoutInput = {
  method: PaymentMethodId
  requestUrl: string
  sessionUser: PaymentCheckoutSessionUser
  items: PaymentCheckoutItem[]
  snapshot: ReturnType<typeof initializeMockData>
}

export type PaymentCheckoutManualField = {
  label: string
  value: string
  monospace?: boolean
}

export type PaymentCheckoutResult = {
  orderId: string
  paymentMethod: PaymentMethodId
  nextAction:
    | {
        type: "REDIRECT"
        url: string
      }
    | {
        type: "MANUAL"
        title: string
        fields: PaymentCheckoutManualField[]
        amount?: number
        currency?: string
        note?: string
      }
}

export function assertPaymentCheckoutResultContract(
  method: PaymentMethodId,
  result: PaymentCheckoutResult
) {
  const provider = getPaymentProviderDefinition(method)

  if (
    result.paymentMethod !== method ||
    result.nextAction.type !== provider.kind ||
    !result.orderId
  ) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  if (result.nextAction.type === "REDIRECT") {
    if (!result.nextAction.url) {
      throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
    }
    return result
  }

  if (
    !result.nextAction.title ||
    result.nextAction.fields.length === 0 ||
    result.nextAction.fields.some(
      (field) => !field.label.trim() || !field.value.trim()
    )
  ) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  return result
}

type PaymentCheckoutAdapter = {
  createCheckout: (
    input: PaymentCheckoutInput
  ) => Promise<PaymentCheckoutResult>
}

function assertCheckoutUser(user: StoredUser | undefined) {
  if (!user || user.isBlocked) {
    throw new Error("Konto jest niedostępne.")
  }

  if (user.roleType === "BIZ" && !user.isApproved) {
    throw new Error("Konto B2B oczekuje na zatwierdzenie.")
  }

  return user
}

function resolveCheckout(
  users: StoredUser[],
  products: Parameters<typeof resolveCartItems>[1],
  sessionUser: PaymentCheckoutSessionUser,
  items: PaymentCheckoutItem[]
) {
  const storedUser = assertCheckoutUser(
    findStoredUserBySession(users, sessionUser)
  )
  const resolved = resolveCartItems(
    items,
    products,
    {
      id: storedUser.id,
      email: storedUser.email,
      role: storedUser.roleType,
      isApproved: storedUser.isApproved,
      isBlocked: storedUser.isBlocked,
      discount: storedUser.discount,
      nip: storedUser.nip,
    },
    { requirePriced: true, requireStock: true }
  )

  return { storedUser, resolved }
}

function assertPaymentStillAvailable(
  control: PaymentControlSettings,
  settings: PaymentMethodSettings,
  method: PaymentMethodId
) {
  if (!isPaymentControlEnabled(control)) {
    throw new Error("PAYMENTS_DISABLED")
  }
  if (!isPaymentMethodEnabled(settings, method)) {
    throw new Error("PAYMENT_METHOD_DISABLED")
  }
}

async function createPrzelewy24Checkout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  const p24 = resolvePrzelewy24Config({ requestUrl: input.requestUrl })
  const { storedUser, resolved } = resolveCheckout(
    input.snapshot.users as StoredUser[],
    input.snapshot.products as Parameters<typeof resolveCartItems>[1],
    input.sessionUser,
    input.items
  )

  const email = storedUser.email?.trim() || input.sessionUser.email?.trim()
  if (!email) {
    throw new Error("Przelewy24 wymaga adresu e-mail klienta.")
  }

  const orderId = `ORD-${crypto.randomUUID()}`
  const amount = moneyToMinorUnits(resolved.total)

  await mutateMockData((db) => {
    assertPaymentStillAvailable(
      db.paymentControl,
      db.paymentMethods,
      "PRZELEWY24"
    )

    const fresh = resolveCheckout(
      db.users as StoredUser[],
      db.products as Parameters<typeof resolveCartItems>[1],
      input.sessionUser,
      input.items
    )

    if (JSON.stringify(fresh.resolved) !== JSON.stringify(resolved)) {
      throw new Error("CHECKOUT_STATE_CHANGED")
    }

    reserveInventory(
      db.products as InventoryProduct[],
      fresh.resolved.items
    )
    const now = new Date().toISOString()

    db.orders.unshift({
      id: orderId,
      orderType: "ORDER",
      createdAt: now,
      status: "PENDING_VERIFICATION",
      estimatedDeliveryDays: null,
      totalPriceOrig: fresh.resolved.total,
      totalPriceFinal: fresh.resolved.total,
      items: fresh.resolved.items,
      user: {
        id: fresh.storedUser.id,
        email: fresh.storedUser.email,
        companyName: fresh.storedUser.companyName,
        nip: fresh.storedUser.nip ?? null,
      },
      paymentProvider: "PRZELEWY24",
      paymentStatus: "PENDING",
      p24SessionId: orderId,
      p24OrderId: null,
      p24LastNotificationSign: null,
      paidAt: null,
      paymentUpdatedAt: null,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      inventoryReservedAt: now,
      inventoryReleasedAt: null,
      inventoryFinalizedAt: null,
      inventoryReReservedAt: null,
    })
  })

  try {
    const registration = await registerPrzelewy24Transaction(p24, {
      sessionId: orderId,
      amount,
      email,
      description: `ONICS ${orderId}`,
    })

    return {
      orderId,
      paymentMethod: "PRZELEWY24",
      nextAction: {
        type: "REDIRECT",
        url: registration.redirectUrl,
      },
    }
  } catch {
    try {
      await cancelFailedPrzelewy24Registration(orderId)
    } catch (compensationError) {
      console.error(
        "Nie udało się zwolnić rezerwacji po błędzie Przelewy24:",
        compensationError
      )
    }

    console.error("Rejestracja transakcji Przelewy24 nie powiodła się.")
    throw new Error(
      "Nie udało się rozpocząć płatności Przelewy24. Spróbuj ponownie."
    )
  }
}

async function createBankTransferCheckout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  let bankConfig: ReturnType<typeof resolveBankTransferConfig>
  try {
    bankConfig = resolveBankTransferConfig()
  } catch (error) {
    console.error("Nieprawidłowa konfiguracja przelewu bankowego:", error)
    throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED")
  }

  const { storedUser, resolved } = resolveCheckout(
    input.snapshot.users as StoredUser[],
    input.snapshot.products as Parameters<typeof resolveCartItems>[1],
    input.sessionUser,
    input.items
  )
  const orderId = `ORD-${crypto.randomUUID()}`

  await mutateMockData((db) => {
    assertPaymentStillAvailable(
      db.paymentControl,
      db.paymentMethods,
      "BANK_TRANSFER"
    )

    const fresh = resolveCheckout(
      db.users as StoredUser[],
      db.products as Parameters<typeof resolveCartItems>[1],
      input.sessionUser,
      input.items
    )

    if (JSON.stringify(fresh.resolved) !== JSON.stringify(resolved)) {
      throw new Error("CHECKOUT_STATE_CHANGED")
    }

    reserveInventory(
      db.products as InventoryProduct[],
      fresh.resolved.items
    )
    const now = new Date().toISOString()

    db.orders.unshift({
      id: orderId,
      orderType: "ORDER",
      createdAt: now,
      status: "PENDING_VERIFICATION",
      estimatedDeliveryDays: null,
      totalPriceOrig: fresh.resolved.total,
      totalPriceFinal: fresh.resolved.total,
      items: fresh.resolved.items,
      user: {
        id: fresh.storedUser.id,
        email: fresh.storedUser.email,
        companyName: fresh.storedUser.companyName,
        nip: fresh.storedUser.nip ?? null,
      },
      paymentProvider: "BANK_TRANSFER",
      paymentStatus: "PENDING",
      bankTransferReference: orderId,
      bankTransferRecipient: bankConfig.recipient,
      bankTransferAccountNumber: bankConfig.accountNumber,
      bankTransferIban: bankConfig.iban,
      bankTransferAmount: fresh.resolved.total,
      bankTransferCurrency: "PLN",
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      inventoryReservedAt: now,
      inventoryReleasedAt: null,
      inventoryFinalizedAt: null,
      inventoryReReservedAt: null,
    })
  })

  return {
    orderId,
    paymentMethod: "BANK_TRANSFER",
    nextAction: {
      type: "MANUAL",
      title: "Dane do przelewu",
      fields: [
        {
          label: "Odbiorca",
          value: bankConfig.recipient,
        },
        {
          label: "IBAN",
          value: bankConfig.iban,
          monospace: true,
        },
        {
          label: "Tytuł przelewu",
          value: orderId,
          monospace: true,
        },
      ],
      amount: resolved.total,
      currency: "PLN",
      note:
        "Zachowaj dokładny tytuł przelewu — identyfikuje on płatność z zamówieniem.",
    },
  }
}

async function createStripeCheckout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  let stripeConfig: ReturnType<typeof resolveStripeCheckoutConfig>
  try {
    stripeConfig = resolveStripeCheckoutConfig({
      requestUrl: input.requestUrl,
    })
  } catch (error) {
    console.error("Nieprawidłowa konfiguracja Stripe:", error)
    throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED")
  }

  const { storedUser, resolved } = resolveCheckout(
    input.snapshot.users as StoredUser[],
    input.snapshot.products as Parameters<typeof resolveCartItems>[1],
    input.sessionUser,
    input.items
  )

  const stripe = new Stripe(stripeConfig.stripeSecretKey)
  const appUrl = stripeConfig.appUrl
  const orderId = `ORD-${crypto.randomUUID()}`

  const session = await stripe.checkout.sessions.create({
    line_items: resolved.items.map((item) => ({
      price_data: {
        currency: "pln",
        unit_amount: moneyToMinorUnits(item.price),
        product_data: {
          name: item.name,
          metadata: {
            sku: item.sku,
            product_id: item.id,
          },
        },
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${appUrl}/oferty/zamowienia?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/koszyk?payment=cancelled`,
    client_reference_id: String(storedUser.id ?? ""),
    customer_email: storedUser.email,
    metadata: {
      order_id: orderId,
      pl_nip: storedUser.nip || "",
      client_role: storedUser.roleType || "RETAIL",
    },
    payment_intent_data: {
      metadata: {
        order_id: orderId,
      },
    },
  })

  if (!session.url) {
    try {
      await stripe.checkout.sessions.expire(session.id)
    } catch (expireError) {
      console.error(
        "Nie udało się wygasić sesji Stripe bez URL:",
        expireError
      )
    }
    throw new Error("Stripe nie zwrócił adresu płatności.")
  }
  const sessionUrl = session.url

  try {
    await mutateMockData((db) => {
      assertPaymentStillAvailable(
        db.paymentControl,
        db.paymentMethods,
        "STRIPE"
      )

      const fresh = resolveCheckout(
        db.users as StoredUser[],
        db.products as Parameters<typeof resolveCartItems>[1],
        input.sessionUser,
        input.items
      )

      if (JSON.stringify(fresh.resolved) !== JSON.stringify(resolved)) {
        throw new Error("CHECKOUT_STATE_CHANGED")
      }

      reserveInventory(
        db.products as InventoryProduct[],
        fresh.resolved.items
      )
      const reservedAt = new Date().toISOString()

      db.orders.unshift({
        id: orderId,
        orderType: "ORDER",
        createdAt: new Date().toISOString(),
        status: "PENDING_VERIFICATION",
        estimatedDeliveryDays: null,
        totalPriceOrig: fresh.resolved.total,
        totalPriceFinal: fresh.resolved.total,
        items: fresh.resolved.items,
        user: {
          id: fresh.storedUser.id,
          email: fresh.storedUser.email,
          companyName: fresh.storedUser.companyName,
          nip: fresh.storedUser.nip ?? null,
        },
        paymentProvider: "STRIPE",
        paymentStatus: "PENDING",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: null,
        paidAt: null,
        inventoryReservationSource: "STRIPE",
        inventoryReservationStatus: "RESERVED",
        inventoryReservedAt: reservedAt,
        inventoryReleasedAt: null,
        inventoryFinalizedAt: null,
        inventoryReReservedAt: null,
      })
    })
  } catch (persistenceError) {
    try {
      await stripe.checkout.sessions.expire(session.id)
    } catch (expireError) {
      console.error(
        "Nie udało się wygasić osieroconej sesji Stripe:",
        expireError
      )
    }
    throw persistenceError
  }

  return {
    orderId,
    paymentMethod: "STRIPE",
    nextAction: {
      type: "REDIRECT",
      url: sessionUrl,
    },
  }
}

const paymentCheckoutAdapters = {
  STRIPE: {
    createCheckout: createStripeCheckout,
  },
  BANK_TRANSFER: {
    createCheckout: createBankTransferCheckout,
  },
  PRZELEWY24: {
    createCheckout: createPrzelewy24Checkout,
  },
} satisfies Record<PaymentMethodId, PaymentCheckoutAdapter>

export async function createPaymentCheckout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  assertPaymentProviderCapability(input.method, "checkout")
  const result =
    await paymentCheckoutAdapters[input.method].createCheckout(input)
  return assertPaymentCheckoutResultContract(input.method, result)
}

export function listPaymentCheckoutAdapterIds(): PaymentMethodId[] {
  return Object.keys(paymentCheckoutAdapters) as PaymentMethodId[]
}
