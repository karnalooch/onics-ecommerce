import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { COMMERCE_TRANSACTION_ROLES } from "@/lib/commerceAccess"
import { appendPaymentAudit } from "@/lib/paymentAudit"
import {
  describePaymentControl,
  describePaymentMethods,
  paymentMethodOperationalStatus,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import {
  PAYMENT_PROVIDER_IDS,
  getPaymentProviderDefinition,
} from "@/lib/paymentProviders"
import { describePaymentProviderOperations } from "@/lib/paymentProviderOperations"
import { runPaymentProviderActivationPreflight } from "@/lib/paymentProviderActivation"
import {
  buildPaymentControlStateToken,
  buildPaymentMethodStateToken,
  isGlobalPaymentSettingsReplay,
  isMethodPaymentSettingsReplay,
} from "@/lib/paymentSettingsState"
import {
  initializeMockData,
  mutateMockData,
  type PaymentAuditEntry,
  type PaymentControlSettings,
  type PaymentMethodSettings,
} from "@/store/serverStore"

type StoredActor = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

function describeAdminPaymentControl(
  snapshot: ReturnType<typeof initializeMockData>
) {
  return {
    ...describePaymentControl(snapshot.paymentControl),
    settingsStateToken: buildPaymentControlStateToken(
      snapshot.paymentControl
    ),
  }
}

function describeAdminPaymentMethods(
  snapshot: ReturnType<typeof initializeMockData>
) {
  const operations = describePaymentProviderOperations(
    snapshot.orders,
    snapshot.paymentOperationEvents
  )
  return describePaymentMethods(snapshot.paymentMethods).map((method) => ({
    ...method,
    settingsStateToken: buildPaymentMethodStateToken(
      snapshot.paymentMethods[method.id]
    ),
    operations: operations[method.id],
  }))
}

function adminPaymentSnapshotResponse(
  snapshot: ReturnType<typeof initializeMockData>,
  replayed = false
) {
  return NextResponse.json(
    {
      control: describeAdminPaymentControl(snapshot),
      methods: describeAdminPaymentMethods(snapshot),
      audit: snapshot.paymentAudit.slice(0, 20),
    },
    {
      headers: replayed
        ? { "Idempotency-Replayed": "true" }
        : undefined,
    }
  )
}

function paymentSettingsConflict() {
  return NextResponse.json(
    {
      error:
        "Ustawienia płatności zmieniły się od ostatniego odczytu. Odśwież dane i ponów zmianę.",
      code: "PAYMENT_SETTINGS_STATE_CONFLICT",
    },
    { status: 409 }
  )
}

function paymentSettingsRequestAborted() {
  return NextResponse.json(
    { error: "Zmiana ustawień płatności została przerwana." },
    { status: 499 }
  )
}

function paymentSettingsAccessRevoked() {
  return NextResponse.json(
    {
      error:
        "Uprawnienia administratora zmieniły się podczas weryfikacji operatora. Zapis został anulowany.",
    },
    { status: 403 }
  )
}

function paymentSettingsMutationErrorResponse(
  error: unknown,
  requestSignal: AbortSignal
) {
  const code = error instanceof Error ? error.message : ""

  if (requestSignal.aborted || code === "REQUEST_ABORTED") {
    return paymentSettingsRequestAborted()
  }

  if (code === "ADMIN_ACCESS_REVOKED") {
    return paymentSettingsAccessRevoked()
  }

  return null
}

function assertCurrentPaymentAdmin(
  users: StoredActor[],
  sessionUser: { id?: string | null; email?: string | null },
  requestSignal: AbortSignal
) {
  if (requestSignal.aborted) {
    throw new Error("REQUEST_ABORTED")
  }

  const currentActor = findStoredUserBySession(users, sessionUser)
  if (!currentActor || !hasAccountRoleAccess(currentActor, ["ADMIN"])) {
    throw new Error("ADMIN_ACCESS_REVOKED")
  }
}

async function validatePaymentProviderActivation(
  method: PaymentMethodId,
  requestSignal: AbortSignal
) {
  const status = paymentMethodOperationalStatus(method)
  if (!status.configured) {
    return NextResponse.json(
      {
        error: getPaymentProviderDefinition(method).misconfiguredMessage,
        configurationIssues: status.configurationIssues,
      },
      { status: 409 }
    )
  }

  const preflight = await runPaymentProviderActivationPreflight(
    method,
    requestSignal
  )
  if (preflight.ok) return null

  console.warn(
    `Payment provider activation preflight failed: ${method} ${preflight.reason}`
  )

  const unavailable = preflight.reason === "PROVIDER_UNAVAILABLE"
  const error =
    preflight.reason === "CREDENTIALS_REJECTED"
      ? "Operator płatności odrzucił dane dostępowe. Sprawdź konfigurację API."
      : unavailable
        ? "Nie udało się zweryfikować połączenia z operatorem płatności. Spróbuj ponownie po przywróceniu dostępności."
        : "Operator płatności odrzucił test dostępu. Sprawdź konfigurację konta i API."

  return NextResponse.json(
    {
      error,
      provider: method,
      activationCheck: {
        status: "FAILED",
        reason: preflight.reason,
      },
    },
    { status: unavailable ? 503 : 409 }
  )
}

const UpdatePaymentSettingsSchema = z.union([
  z.object({
    scope: z.literal("GLOBAL"),
    expectedStateToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    enabled: z.boolean(),
    maintenanceMessage: z.string().trim().max(160).nullable().optional(),
  }),
  z
    .object({
      scope: z.literal("METHOD").optional(),
      id: z.enum(PAYMENT_PROVIDER_IDS),
      expectedStateToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
      enabled: z.boolean().optional(),
      displayName: z.string().trim().min(1).max(80).optional(),
      displayOrder: z.coerce.number().int().min(0).max(999).optional(),
      maintenanceMessage: z.string().trim().max(160).nullable().optional(),
    })
    .refine(
      (value) =>
        value.enabled !== undefined ||
        value.displayName !== undefined ||
        value.displayOrder !== undefined ||
        value.maintenanceMessage !== undefined,
      { message: "Brak ustawień metody płatności do zapisania." }
    ),
])

export async function GET() {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  const snapshot = initializeMockData()
  const methods = describePaymentMethods(snapshot.paymentMethods)
  const visibleMethods =
    authCheck.currentRole === "ADMIN"
      ? describeAdminPaymentMethods(snapshot)
      : methods.map(({ configurationIssues, ...method }) => {
          void configurationIssues
          return method
        })

  return NextResponse.json({
    control:
      authCheck.currentRole === "ADMIN"
        ? describeAdminPaymentControl(snapshot)
        : describePaymentControl(snapshot.paymentControl),
    methods: visibleMethods,
    ...(authCheck.currentRole === "ADMIN"
      ? { audit: snapshot.paymentAudit.slice(0, 20) }
      : {}),
  })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = UpdatePaymentSettingsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Nieprawidłowe ustawienie płatności.",
      },
      { status: 400 }
    )
  }

  if (parsed.data.expectedStateToken === undefined) {
    return NextResponse.json(
      {
        error:
          "Aktualizacja ustawień płatności wymaga expectedStateToken z ostatniego odczytu.",
      },
      { status: 428 }
    )
  }

  if (parsed.data.scope === "GLOBAL") {
    const globalUpdate = parsed.data
    const activationSnapshot = initializeMockData()
    const observedControlToken = globalUpdate.expectedStateToken
    const initialControl = activationSnapshot.paymentControl
    const initialControlToken =
      buildPaymentControlStateToken(initialControl)

    if (observedControlToken !== initialControlToken) {
      return isGlobalPaymentSettingsReplay(initialControl, globalUpdate)
        ? adminPaymentSnapshotResponse(activationSnapshot, true)
        : paymentSettingsConflict()
    }

    if (isGlobalPaymentSettingsReplay(initialControl, globalUpdate)) {
      return adminPaymentSnapshotResponse(activationSnapshot, true)
    }

    if (
      globalUpdate.enabled &&
      !activationSnapshot.paymentControl.enabled
    ) {
      for (const method of PAYMENT_PROVIDER_IDS) {
        if (!activationSnapshot.paymentMethods[method]?.enabled) continue
        const activationError = await validatePaymentProviderActivation(
          method,
          req.signal
        )
        if (req.signal.aborted) {
          return paymentSettingsRequestAborted()
        }
        if (activationError) return activationError
      }
    }

    let result: { conflict: boolean; replayed: boolean }
    try {
      result = await mutateMockData((db) => {
      assertCurrentPaymentAdmin(
        db.users as StoredActor[],
        authCheck.user,
        req.signal
      )

      const paymentControl = db.paymentControl as PaymentControlSettings
      const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
      const freshToken = buildPaymentControlStateToken(paymentControl)

      if (observedControlToken !== freshToken) {
        return {
          conflict: !isGlobalPaymentSettingsReplay(
            paymentControl,
            globalUpdate
          ),
          replayed: isGlobalPaymentSettingsReplay(
            paymentControl,
            globalUpdate
          ),
        }
      }

      if (isGlobalPaymentSettingsReplay(paymentControl, globalUpdate)) {
        return { conflict: false, replayed: true }
      }

      const nextMaintenanceMessage =
        globalUpdate.maintenanceMessage?.trim() || null
      const previousEnabled = paymentControl.enabled
      const previousMaintenanceMessage =
        paymentControl.maintenanceMessage

      paymentControl.enabled = globalUpdate.enabled
      paymentControl.maintenanceMessage = nextMaintenanceMessage

      const auditEntry = appendPaymentAudit(
        paymentAudit,
        authCheck.user,
        {
          target: "GLOBAL",
          previousEnabled,
          nextEnabled: globalUpdate.enabled,
          previousMaintenanceMessage,
          nextMaintenanceMessage,
        }
      )

      if (auditEntry) {
        paymentControl.updatedAt = auditEntry.createdAt
      }

      return { conflict: false, replayed: false }
      })
    } catch (error) {
      const response = paymentSettingsMutationErrorResponse(error, req.signal)
      if (response) return response
      throw error
    }

    if (result.conflict) return paymentSettingsConflict()

    return adminPaymentSnapshotResponse(
      initializeMockData(),
      result.replayed
    )
  }

  const methodUpdate = parsed.data
  const method = methodUpdate.id as PaymentMethodId

  const activationSnapshot = initializeMockData()
  const observedMethodToken = methodUpdate.expectedStateToken
  const initialMethod = activationSnapshot.paymentMethods[method]
  const initialMethodToken = buildPaymentMethodStateToken(initialMethod)

  if (observedMethodToken !== initialMethodToken) {
    return isMethodPaymentSettingsReplay(initialMethod, methodUpdate)
      ? adminPaymentSnapshotResponse(activationSnapshot, true)
      : paymentSettingsConflict()
  }

  if (isMethodPaymentSettingsReplay(initialMethod, methodUpdate)) {
    return adminPaymentSnapshotResponse(activationSnapshot, true)
  }

  if (
    methodUpdate.enabled === true &&
    initialMethod?.enabled !== true
  ) {
    const activationError = await validatePaymentProviderActivation(
      method,
      req.signal
    )
    if (req.signal.aborted) {
      return paymentSettingsRequestAborted()
    }
    if (activationError) return activationError
  }

  let result: { conflict: boolean; replayed: boolean }
  try {
    result = await mutateMockData((db) => {
    assertCurrentPaymentAdmin(
      db.users as StoredActor[],
      authCheck.user,
      req.signal
    )

    const paymentMethods = db.paymentMethods as PaymentMethodSettings
    const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
    const previous = paymentMethods[method]
    const freshToken = buildPaymentMethodStateToken(previous)

    if (observedMethodToken !== freshToken) {
      const replayed = isMethodPaymentSettingsReplay(
        previous,
        methodUpdate
      )
      return { conflict: !replayed, replayed }
    }

    if (isMethodPaymentSettingsReplay(previous, methodUpdate)) {
      return { conflict: false, replayed: true }
    }

    const next = {
      ...previous,
      enabled: methodUpdate.enabled ?? previous.enabled,
      displayName:
        methodUpdate.displayName?.trim() || previous.displayName,
      displayOrder:
        methodUpdate.displayOrder ?? previous.displayOrder,
      maintenanceMessage:
        methodUpdate.maintenanceMessage === undefined
          ? previous.maintenanceMessage
          : methodUpdate.maintenanceMessage?.trim() || null,
    }

    const auditEntry = appendPaymentAudit(
      paymentAudit,
      authCheck.user,
      {
        target: method,
        previousEnabled: previous.enabled,
        nextEnabled: next.enabled,
        previousMaintenanceMessage: previous.maintenanceMessage,
        nextMaintenanceMessage: next.maintenanceMessage,
        previousDisplayName: previous.displayName,
        nextDisplayName: next.displayName,
        previousDisplayOrder: previous.displayOrder,
        nextDisplayOrder: next.displayOrder,
      }
    )

    paymentMethods[method] = {
      ...next,
      updatedAt: auditEntry?.createdAt ?? previous.updatedAt,
    }

    return { conflict: false, replayed: false }
    })
  } catch (error) {
    const response = paymentSettingsMutationErrorResponse(error, req.signal)
    if (response) return response
    throw error
  }

  if (result.conflict) return paymentSettingsConflict()

  return adminPaymentSnapshotResponse(
    initializeMockData(),
    result.replayed
  )

}