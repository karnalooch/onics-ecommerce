// src/app/admin/repairs/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAPI } from "@/lib/authUtils";
import { hasAccountRoleAccess } from "@/lib/accountAccess";
import { findStoredUserBySession } from "@/lib/sessionIdentity";
import { mutateMockData } from "@/store/serverStore";
import { buildRepairSubmissionFingerprint } from "@/lib/repairSubmissionIdempotency";
import {
  canDeleteRepair,
  validateRepairStatusWrite,
  type RepairStatus,
} from "@/lib/repairLifecycle";

const RepairSchema = z.object({
  requestId: z.string().uuid("Nieprawidłowy identyfikator zgłoszenia"),
  client: z.string().trim().min(2, "Nazwa klienta jest za krótka"),
  item: z.string().trim().min(2, "Nazwa urządzenia jest za krótka"),
  serial: z.string().trim().optional(),
  description: z.string().trim().max(3000).optional(),
});

type RepairRecord = {
  id: string
  clientRepairRequestId?: string
  clientRepairRequestFingerprint?: string
  repairSubmissionChannel?: "ACCOUNT_API" | "ADMIN_ACTION" | string
  status?: string
  [key: string]: unknown
}

export type ActionState =
  | { success: true; message: string; data?: any }
  | { success: false; error: string };

type StoredActor = {
  id?: string;
  email?: string;
  roleType?: string;
  isApproved?: boolean;
  isBlocked?: boolean;
};

type SessionActor = {
  id?: string;
  email?: string | null;
};

type AdminActionAuth =
  | { authorized: true; actor: SessionActor }
  | { authorized: false; response: ActionState };

async function requireAdminAction(): Promise<AdminActionAuth> {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) {
    return {
      authorized: false,
      response: { success: false, error: "Brak uprawnień administratora." },
    };
  }
  return { authorized: true, actor: authCheck.user };
}

function assertCurrentAdminActionAccess(
  users: StoredActor[],
  actor: SessionActor
) {
  const currentActor = findStoredUserBySession(users, actor);
  if (
    !currentActor ||
    !hasAccountRoleAccess(currentActor, ["ADMIN"])
  ) {
    throw new Error("ADMIN_ACCESS_REVOKED");
  }
}

function currentAdminActionError(error: unknown): ActionState | null {
  return error instanceof Error && error.message === "ADMIN_ACCESS_REVOKED"
    ? {
        success: false,
        error:
          "Uprawnienia administratora zmieniły się przed zapisem. Odśwież panel i spróbuj ponownie.",
      }
    : null;
}

export async function addRepairAction(formData: FormData): Promise<ActionState> {
  const adminAuth = await requireAdminAction();
  if (!adminAuth.authorized) return adminAuth.response;

  const rawData = {
    requestId: formData.get("requestId"),
    client: formData.get("client"),
    item: formData.get("item"),
    serial: formData.get("serial") || "N/A",
    description: formData.get("description") || "",
  };

  const validated = RepairSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const submission = await mutateMockData((db) => {
      assertCurrentAdminActionAccess(
        db.users as StoredActor[],
        adminAuth.actor
      );
      const repairs = db.repairs as RepairRecord[]
      const requestFingerprint = buildRepairSubmissionFingerprint({
        client: validated.data.client,
        item: validated.data.item,
        serial: validated.data.serial || "N/A",
        description: validated.data.description || "",
      })
      const existing = repairs.find(
        (repair) =>
          repair.repairSubmissionChannel === "ADMIN_ACTION" &&
          repair.clientRepairRequestId === validated.data.requestId
      )

      if (existing) {
        if (
          existing.clientRepairRequestFingerprint !== requestFingerprint
        ) {
          throw new Error("REPAIR_IDEMPOTENCY_KEY_REUSED")
        }
        return { repair: existing, replayed: true }
      }

      const repair: RepairRecord = {
        client: validated.data.client,
        item: validated.data.item,
        serial: validated.data.serial || "N/A",
        description: validated.data.description || "",
        id: `RMA-${crypto.randomUUID()}`,
        clientRepairRequestId: validated.data.requestId,
        clientRepairRequestFingerprint: requestFingerprint,
        repairSubmissionChannel: "ADMIN_ACTION",
        date: new Date().toISOString().split("T")[0],
        status: "WERYFIKACJA",
      }
      repairs.unshift(repair)
      return { repair, replayed: false }
    })

    const {
      clientRepairRequestId: internalRequestId,
      clientRepairRequestFingerprint: internalRequestFingerprint,
      repairSubmissionChannel: internalSubmissionChannel,
      ...publicRepair
    } = submission.repair
    void internalRequestId
    void internalRequestFingerprint
    void internalSubmissionChannel

    revalidatePath("/admin/repairs");
    return {
      success: true,
      message: submission.replayed
        ? "Zgłoszenie już istniało — przywrócono jego wynik."
        : "Zgłoszenie zostało dodane.",
      data: publicRepair,
    };
  } catch (error) {
    const adminError = currentAdminActionError(error);
    if (adminError) return adminError;
    if (
      error instanceof Error &&
      error.message === "REPAIR_IDEMPOTENCY_KEY_REUSED"
    ) {
      return {
        success: false,
        error:
          "Identyfikator zgłoszenia został już użyty dla innej treści. Zamknij formularz i spróbuj ponownie.",
      };
    }
    return { success: false, error: "Wystąpił błąd podczas dodawania zgłoszenia." };
  }
}

export async function deleteRepairAction(id: string): Promise<ActionState> {
  const adminAuth = await requireAdminAction();
  if (!adminAuth.authorized) return adminAuth.response;

  try {
    await mutateMockData((db) => {
      assertCurrentAdminActionAccess(
        db.users as StoredActor[],
        adminAuth.actor
      );
      const repairs = db.repairs as RepairRecord[]
      const index = repairs.findIndex((repair) => repair.id === id)
      if (index === -1) throw new Error("REPAIR_NOT_FOUND")
      if (!canDeleteRepair(repairs[index].status)) {
        throw new Error("REPAIR_HISTORY_PROTECTED")
      }
      repairs.splice(index, 1)
    })

    revalidatePath("/admin/repairs");
    return { success: true, message: "Zgłoszenie usunięte." };
  } catch (error) {
    const adminError = currentAdminActionError(error);
    if (adminError) return adminError;
    if (error instanceof Error && error.message === "REPAIR_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono zgłoszenia." };
    }
    if (error instanceof Error && error.message === "REPAIR_HISTORY_PROTECTED") {
      return {
        success: false,
        error:
          "Nie można usunąć zgłoszenia po rozpoczęciu obsługi. Historia serwisowa musi zostać zachowana."
      };
    }
    return { success: false, error: "Błąd serwera." };
  }
}

export async function updateStatusAction(
  id: string,
  status: string,
  expectedStatus: string
): Promise<ActionState> {
  const adminAuth = await requireAdminAction();
  if (!adminAuth.authorized) return adminAuth.response;

  if (!id.trim()) {
    return { success: false, error: "Brak identyfikatora zgłoszenia." };
  }
  if (!expectedStatus.trim()) {
    return { success: false, error: "Brak oczekiwanego statusu zgłoszenia." };
  }

  try {
    const submission = await mutateMockData((db) => {
      assertCurrentAdminActionAccess(
        db.users as StoredActor[],
        adminAuth.actor
      );
      const repairs = db.repairs as RepairRecord[]
      const repair = repairs.find((entry) => entry.id === id)
      if (!repair) throw new Error("REPAIR_NOT_FOUND")

      const write = validateRepairStatusWrite(
        repair.status,
        expectedStatus,
        status
      )
      if (write === "invalid-status") {
        throw new Error("REPAIR_INVALID_STATUS")
      }
      if (write === "terminal-status") {
        throw new Error("REPAIR_TERMINAL_STATUS")
      }
      if (write === "conflict") {
        throw new Error("REPAIR_STATUS_CONFLICT")
      }
      if (write === "replay") {
        return { replayed: true }
      }

      repair.status = status as RepairStatus
      return { replayed: false }
    })

    revalidatePath("/admin/repairs");
    return {
      success: true,
      message: submission.replayed
        ? `Status już był ustawiony na ${status}.`
        : `Status zmieniony na ${status}`,
    };
  } catch (error) {
    const adminError = currentAdminActionError(error);
    if (adminError) return adminError;
    if (error instanceof Error && error.message === "REPAIR_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono zgłoszenia." };
    }
    if (error instanceof Error && error.message === "REPAIR_INVALID_STATUS") {
      return { success: false, error: "Nieprawidłowy status zgłoszenia." };
    }
    if (error instanceof Error && error.message === "REPAIR_TERMINAL_STATUS") {
      return {
        success: false,
        error: "Zakończonego zgłoszenia nie można ponownie otworzyć."
      };
    }
    if (error instanceof Error && error.message === "REPAIR_STATUS_CONFLICT") {
      return {
        success: false,
        error:
          "Status zgłoszenia zmienił się od ostatniego odczytu. Odśwież dane i ponów zmianę."
      };
    }
    return { success: false, error: "Błąd serwera." };
  }
}
