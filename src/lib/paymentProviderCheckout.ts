import Stripe from "stripe"
import { createHash } from "node:crypto"
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
  buildPaymentControlStateToken,
  buildPaymentMethodStateToken,
} from "@/lib/paymentSettingsState"
import {
  reserveInventory,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import {
  applyExpiredCheckoutCancellation,
  type StripeCancelableOrder,
} from "@/lib/refunds"
import {
  initializeMockData,
  mutateMockData,
  type PaymentControlSettings,
  type PaymentMethodSettings,
} from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { isCommerceTransactionRole } from "@/lib/commerceAccess"
import {
  assertPaymentProviderCapability,
  getPaymentProviderDefinition,
} from "@/lib/paymentProviders"
import {
  registerPrzelewy24Transaction,
  resolvePrzelewy24Config,
} from "@/lib/przelewy24"
import { buildPaymentCheckoutFingerprint } from "@/lib/paymentCheckoutIdempotency"

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
  requestId: string
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

type PaymentCheckoutAvailabilityFence = {
  controlStateToken: string
  methodStateToken: string
}

function buildPaymentCheckoutAvailabilityFence(
  control: PaymentControlSettings,
  settings: PaymentMethodSettings,
  method: PaymentMethodId
): PaymentCheckoutAvailabilityFence {
  assertPaymentStillAvailable(control, settings, method)
  return {
    controlStateToken: buildPaymentControlStateToken(control),
    methodStateToken: buildPaymentMethodStateToken(settings[method]),
  }
}

function assertPaymentCheckoutAvailabilityFence(
  control: PaymentControlSettings,
  settings: PaymentMethodSettings,
  method: PaymentMethodId,
  fence: PaymentCheckoutAvailabilityFence
) {
  assertPaymentStillAvailable(control, settings, method)

  if (
    buildPaymentControlStateToken(control) !== fence.controlStateToken ||
    buildPaymentMethodStateToken(settings[method]) !== fence.methodStateToken
  ) {
    throw new Error("PAYMENT_CHECKOUT_AVAILABILITY_CHANGED")
  }
}

function assertCheckoutUser(user: StoredUser | undefined) {
  if (!user || user.isBlocked) {
    throw new Error("Konto jest niedostępne.")
  }

  if (!isCommerceTransactionRole(user.roleType)) {
    throw new Error("CHECKOUT_ROLE_NOT_ALLOWED")
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

export type StoredPaymentCheckoutOrder = {
  id?: string
  clientCheckoutRequestId?: string
  clientCheckoutFingerprint?: string
  paymentProvider?: string | null
  paymentCheckoutRegistrationStatus?: string | null
  totalPriceFinal?: number
  items?: unknown[]
  user?: StoredUser
  stripeCheckoutSessionId?: string | null
  p24SessionId?: string | null
  p24CheckoutRedirectUrl?: string | null
  bankTransferRecipient?: string | null
  bankTransferIban?: string | null
  bankTransferAmount?: number | null
  [key: string]: unknown
}

function checkoutFingerprint(input: PaymentCheckoutInput) {
  return buildPaymentCheckoutFingerprint({
    paymentMethod: input.method,
    items: input.items,
  })
}

function findExistingPaymentCheckout(
  orders: StoredPaymentCheckoutOrder[],
  input: PaymentCheckoutInput
) {
  return orders.find(
    (order) =>
      order.clientCheckoutRequestId === input.requestId &&
      order.user &&
      Boolean(findStoredUserBySession([order.user], input.sessionUser))
  )
}

function assertMatchingPaymentCheckout(
  order: StoredPaymentCheckoutOrder,
  input: PaymentCheckoutInput,
  fingerprint: string
) {
  if (
    order.paymentProvider !== input.method ||
    order.clientCheckoutFingerprint !== fingerprint
  ) {
    throw new Error("PAYMENT_CHECKOUT_IDEMPOTENCY_KEY_REUSED")
  }
  return order
}

function deterministicCheckoutOrderId(
  input: PaymentCheckoutInput,
  user: StoredUser
) {
  const owner = String(
    user.id ?? user.email ?? input.sessionUser.id ?? input.sessionUser.email ?? ""
  ).trim().toLowerCase()
  if (!owner) {
    throw new Error("Konto nie ma stabilnej tożsamości checkoutu.")
  }

  const digest = createHash("sha256")
    .update(`${owner}\n${input.method}\n${input.requestId}`, "utf8")
    .digest("hex")
  return `ORD-${digest.slice(0, 32)}`
}

function bankTransferResult(
  order: StoredPaymentCheckoutOrder
): PaymentCheckoutResult {
  const orderId = String(order.id ?? "").trim()
  const recipient = String(order.bankTransferRecipient ?? "").trim()
  const iban = String(order.bankTransferIban ?? "").trim()
  const amount = Number(order.bankTransferAmount ?? order.totalPriceFinal)

  if (
    !orderId ||
    !recipient ||
    !iban ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  return {
    orderId,
    paymentMethod: "BANK_TRANSFER",
    nextAction: {
      type: "MANUAL",
      title: "Dane do przelewu",
      fields: [
        { label: "Odbiorca", value: recipient },
        { label: "IBAN", value: iban, monospace: true },
        { label: "Tytuł przelewu", value: orderId, monospace: true },
      ],
      amount,
      currency: "PLN",
      note:
        "Zachowaj dokładny tytuł przelewu — identyfikuje on płatność z zamówieniem.",
    },
  }
}

function przelewy24Result(
  order: StoredPaymentCheckoutOrder
): PaymentCheckoutResult {
  const orderId = String(order.id ?? "").trim()
  const redirectUrl = String(order.p24CheckoutRedirectUrl ?? "").trim()
  if (!orderId || !redirectUrl) {
    throw new Error("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
  }

  return {
    orderId,
    paymentMethod: "PRZELEWY24",
    nextAction: {
      type: "REDIRECT",
      url: redirectUrl,
    },
  }
}

async function createPrzelewy24Checkout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  const fingerprint = checkoutFingerprint(input)
  const snapshotReplay = findExistingPaymentCheckout(
    input.snapshot.orders as StoredPaymentCheckoutOrder[],
    input
  )
  if (snapshotReplay) {
    assertMatchingPaymentCheckout(snapshotReplay, input, fingerprint)
    return przelewy24Result(snapshotReplay)
  }

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

  const orderId = deterministicCheckoutOrderId(input, storedUser)
  const amount = moneyToMinorUnits(resolved.total)

  const claimed = await mutateMockData((db) => {
    const orderStore = db.orders as StoredPaymentCheckoutOrder[]
    const existing = findExistingPaymentCheckout(orderStore, input)
    if (existing) {
      return {
        order: assertMatchingPaymentCheckout(existing, input, fingerprint),
        created: false,
      }
    }

    const availabilityFence = buildPaymentCheckoutAvailabilityFence(
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
    const order: StoredPaymentCheckoutOrder = {
      id: orderId,
      clientCheckoutRequestId: input.requestId,
      clientCheckoutFingerprint: fingerprint,
      paymentCheckoutRegistrationStatus: "PENDING",
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
      p24CheckoutRedirectUrl: null,
      p24LastNotificationSign: null,
      p24VerificationPending: null,
      p24VerificationPendingAt: null,
      paidAt: null,
      paymentUpdatedAt: null,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      inventoryReservedAt: now,
      inventoryReleasedAt: null,
      inventoryFinalizedAt: null,
      inventoryReReservedAt: null,
    }
    orderStore.unshift(order)
    return { order, created: true, availabilityFence }
  })

  if (!claimed.created) {
    return przelewy24Result(claimed.order)
  }

  const availabilityFence = claimed.availabilityFence
  if (!availabilityFence) {
    throw new Error("PAYMENT_CHECKOUT_AVAILABILITY_FENCE_MISSING")
  }

  let registration: Awaited<ReturnType<typeof registerPrzelewy24Transaction>>
  try {
    registration = await registerPrzelewy24Transaction(p24, {
      sessionId: orderId,
      amount,
      email,
      description: `ONICS ${orderId}`,
    })

    await mutateMockData((db) => {
      const existing = findExistingPaymentCheckout(
        db.orders as StoredPaymentCheckoutOrder[],
        input
      )
      if (!existing || existing.id !== orderId) {
        throw new Error("PAYMENT_CHECKOUT_LOCAL_ORDER_MISSING")
      }
      assertMatchingPaymentCheckout(existing, input, fingerprint)
      assertPaymentCheckoutAvailabilityFence(
        db.paymentControl,
        db.paymentMethods,
        "PRZELEWY24",
        availabilityFence
      )
      existing.p24CheckoutRedirectUrl = registration.redirectUrl
      existing.paymentCheckoutRegistrationStatus = "READY"
    })
  } catch (error) {
    try {
      await mutateMockData((db) => {
        const existing = findExistingPaymentCheckout(
          db.orders as StoredPaymentCheckoutOrder[],
          input
        )
        if (
          existing &&
          existing.id === orderId &&
          existing.paymentCheckoutRegistrationStatus !== "READY"
        ) {
          existing.paymentCheckoutRegistrationStatus = "UNCERTAIN"
        }
      })
    } catch (markError) {
      console.error(
        "Nie udało się oznaczyć niepewnej rejestracji Przelewy24:",
        markError
      )
    }

    console.error("Niepewny wynik rejestracji transakcji Przelewy24:", error)
    throw new Error("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
  }

  return {
    orderId,
    paymentMethod: "PRZELEWY24",
    nextAction: {
      type: "REDIRECT",
      url: registration.redirectUrl,
    },
  }
}

async function createBankTransferCheckout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  const fingerprint = checkoutFingerprint(input)
  const snapshotReplay = findExistingPaymentCheckout(
    input.snapshot.orders as StoredPaymentCheckoutOrder[],
    input
  )
  if (snapshotReplay) {
    assertMatchingPaymentCheckout(snapshotReplay, input, fingerprint)
    return bankTransferResult(snapshotReplay)
  }

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
  const orderId = deterministicCheckoutOrderId(input, storedUser)

  const claimed = await mutateMockData((db) => {
    const orderStore = db.orders as StoredPaymentCheckoutOrder[]
    const existing = findExistingPaymentCheckout(orderStore, input)
    if (existing) {
      return assertMatchingPaymentCheckout(existing, input, fingerprint)
    }

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
    const order: StoredPaymentCheckoutOrder = {
      id: orderId,
      clientCheckoutRequestId: input.requestId,
      clientCheckoutFingerprint: fingerprint,
      paymentCheckoutRegistrationStatus: "READY",
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
    }
    orderStore.unshift(order)
    return order
  })

  return bankTransferResult(claimed)
}

export async function createOrRecoverStripeCheckoutSession(
  stripe: Stripe,
  order: StoredPaymentCheckoutOrder,
  appUrl: string
) {
  const orderId = String(order.id ?? "").trim()
  const checkoutItems = order.items as
    | Array<{
        id: string
        sku: string
        name: string
        quantity: number
        price: number
      }>
    | undefined
  const checkoutUser = order.user

  if (!orderId || !checkoutItems?.length || !checkoutUser) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  const session = await stripe.checkout.sessions.create(
    {
      line_items: checkoutItems.map((item) => ({
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
      client_reference_id: String(checkoutUser.id ?? ""),
      customer_email: checkoutUser.email,
      metadata: {
        order_id: orderId,
        pl_nip: checkoutUser.nip || "",
        client_role: checkoutUser.roleType || "BIZ",
      },
      payment_intent_data: {
        metadata: {
          order_id: orderId,
        },
      },
    },
    {
      idempotencyKey: `onics-checkout:${orderId}`,
    }
  )

  return session
}

function isCheckoutAvailabilityFenceError(error: unknown) {
  const code = error instanceof Error ? error.message : ""
  return (
    code === "PAYMENTS_DISABLED" ||
    code === "PAYMENT_METHOD_DISABLED" ||
    code === "PAYMENT_CHECKOUT_AVAILABILITY_CHANGED"
  )
}

async function settleStripeCheckoutAvailabilityRace(
  stripe: Stripe,
  input: PaymentCheckoutInput,
  fingerprint: string,
  orderId: string,
  session: Stripe.Checkout.Session
) {
  let providerSession = session

  if (
    providerSession.status === "open" &&
    providerSession.payment_status !== "paid"
  ) {
    try {
      providerSession = await stripe.checkout.sessions.expire(
        providerSession.id
      )
    } catch (expireError) {
      try {
        providerSession = await stripe.checkout.sessions.retrieve(
          providerSession.id
        )
      } catch (refreshError) {
        console.error(
          "Stripe checkout availability-race refresh failed:",
          refreshError
        )
      }
      if (providerSession.status !== "expired") {
        console.error(
          "Stripe checkout availability-race expiry did not settle:",
          expireError
        )
      }
    }
  }

  await mutateMockData((db) => {
    const existing = findExistingPaymentCheckout(
      db.orders as StoredPaymentCheckoutOrder[],
      input
    )
    if (!existing || existing.id !== orderId) {
      throw new Error("PAYMENT_CHECKOUT_LOCAL_ORDER_MISSING")
    }
    assertMatchingPaymentCheckout(existing, input, fingerprint)
    if (
      existing.stripeCheckoutSessionId &&
      existing.stripeCheckoutSessionId !== providerSession.id
    ) {
      throw new Error("PAYMENT_CHECKOUT_PROVIDER_REPLAY_MISMATCH")
    }

    existing.stripeCheckoutSessionId = providerSession.id
    existing.paymentCheckoutRegistrationStatus = "READY"

    if (
      providerSession.status === "expired" &&
      providerSession.payment_status !== "paid"
    ) {
      const stripeOrder = existing as StoredPaymentCheckoutOrder &
        StripeCancelableOrder

      if (
        stripeOrder.paymentStatus !== "PAID" &&
        stripeOrder.paymentStatus !== "REFUNDED" &&
        stripeOrder.status !== "SHIPPED" &&
        stripeOrder.status !== "RETURNED" &&
        stripeOrder.inventoryReservationStatus !== "FINALIZED"
      ) {
        applyExpiredCheckoutCancellation(
          db.products as InventoryProduct[],
          stripeOrder
        )
      }
    }
  })

  return providerSession
}

async function createStripeCheckout(
  input: PaymentCheckoutInput
): Promise<PaymentCheckoutResult> {
  const fingerprint = checkoutFingerprint(input)

  let stripeConfig: ReturnType<typeof resolveStripeCheckoutConfig>
  try {
    stripeConfig = resolveStripeCheckoutConfig({
      requestUrl: input.requestUrl,
    })
  } catch (error) {
    console.error("Nieprawidłowa konfiguracja Stripe:", error)
    throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED")
  }

  const stripe = new Stripe(stripeConfig.stripeSecretKey)
  const appUrl = stripeConfig.appUrl
  const snapshotReplay = findExistingPaymentCheckout(
    input.snapshot.orders as StoredPaymentCheckoutOrder[],
    input
  )

  let claimed: StoredPaymentCheckoutOrder
  let availabilityFence: PaymentCheckoutAvailabilityFence | null = null
  if (snapshotReplay) {
    claimed = assertMatchingPaymentCheckout(
      snapshotReplay,
      input,
      fingerprint
    )
  } else {
    const { storedUser, resolved } = resolveCheckout(
      input.snapshot.users as StoredUser[],
      input.snapshot.products as Parameters<typeof resolveCartItems>[1],
      input.sessionUser,
      input.items
    )
    const orderId = deterministicCheckoutOrderId(input, storedUser)

    const claim = await mutateMockData((db) => {
      const orderStore = db.orders as StoredPaymentCheckoutOrder[]
      const existing = findExistingPaymentCheckout(orderStore, input)
      if (existing) {
        return {
          order: assertMatchingPaymentCheckout(existing, input, fingerprint),
          availabilityFence: null,
        }
      }

      const freshAvailabilityFence =
        buildPaymentCheckoutAvailabilityFence(
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
      const now = new Date().toISOString()
      const order: StoredPaymentCheckoutOrder = {
        id: orderId,
        clientCheckoutRequestId: input.requestId,
        clientCheckoutFingerprint: fingerprint,
        paymentCheckoutRegistrationStatus: "PENDING",
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
        paymentProvider: "STRIPE",
        paymentStatus: "PENDING",
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        paidAt: null,
        inventoryReservationSource: "STRIPE",
        inventoryReservationStatus: "RESERVED",
        inventoryReservedAt: now,
        inventoryReleasedAt: null,
        inventoryFinalizedAt: null,
        inventoryReReservedAt: null,
      }
      orderStore.unshift(order)
      return {
        order,
        availabilityFence: freshAvailabilityFence,
      }
    })
    claimed = claim.order
    availabilityFence = claim.availabilityFence
  }

  const orderId = String(claimed.id ?? "").trim()
  if (!orderId) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  if (claimed.stripeCheckoutSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      claimed.stripeCheckoutSessionId
    )
    if (!existingSession.url) {
      throw new Error("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
    }

    return {
      orderId,
      paymentMethod: "STRIPE",
      nextAction: {
        type: "REDIRECT",
        url: existingSession.url,
      },
    }
  }

  if (!availabilityFence) {
    const freshSnapshot = initializeMockData()
    const freshOrder = findExistingPaymentCheckout(
      freshSnapshot.orders as StoredPaymentCheckoutOrder[],
      input
    )
    if (!freshOrder || freshOrder.id !== orderId) {
      throw new Error("PAYMENT_CHECKOUT_LOCAL_ORDER_MISSING")
    }
    assertMatchingPaymentCheckout(freshOrder, input, fingerprint)
    availabilityFence = buildPaymentCheckoutAvailabilityFence(
      freshSnapshot.paymentControl,
      freshSnapshot.paymentMethods,
      "STRIPE"
    )
  }

  const checkoutAvailabilityFence = availabilityFence
  if (!checkoutAvailabilityFence) {
    throw new Error("PAYMENT_CHECKOUT_AVAILABILITY_FENCE_MISSING")
  }

  const session = await createOrRecoverStripeCheckoutSession(
    stripe,
    claimed,
    appUrl
  )

  try {
    await mutateMockData((db) => {
      const existing = findExistingPaymentCheckout(
        db.orders as StoredPaymentCheckoutOrder[],
        input
      )
      if (!existing || existing.id !== orderId) {
        throw new Error("PAYMENT_CHECKOUT_LOCAL_ORDER_MISSING")
      }
      assertMatchingPaymentCheckout(existing, input, fingerprint)
      assertPaymentCheckoutAvailabilityFence(
        db.paymentControl,
        db.paymentMethods,
        "STRIPE",
        checkoutAvailabilityFence
      )
      if (
        existing.stripeCheckoutSessionId &&
        existing.stripeCheckoutSessionId !== session.id
      ) {
        throw new Error("PAYMENT_CHECKOUT_PROVIDER_REPLAY_MISMATCH")
      }
      existing.stripeCheckoutSessionId = session.id
      existing.paymentCheckoutRegistrationStatus = "READY"
    })
  } catch (error) {
    if (!isCheckoutAvailabilityFenceError(error)) throw error

    try {
      await settleStripeCheckoutAvailabilityRace(
        stripe,
        input,
        fingerprint,
        orderId,
        session
      )
    } catch (settleError) {
      console.error(
        "Nie udało się domknąć Stripe po zmianie dostępności checkoutu:",
        settleError
      )
      throw new Error("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
    }
    throw new Error("PAYMENT_CHECKOUT_AVAILABILITY_CHANGED")
  }

  if (!session.url) {
    throw new Error("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
  }

  return {
    orderId,
    paymentMethod: "STRIPE",
    nextAction: {
      type: "REDIRECT",
      url: session.url,
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
