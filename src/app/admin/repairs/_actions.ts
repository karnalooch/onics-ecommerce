// src/app/admin/repairs/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAPI } from "@/lib/authUtils";
import { mutateMockData } from "@/store/serverStore";
import {
  canDeleteRepair,
  validateRepairStatusTransition,
  type RepairStatus,
} from "@/lib/repairLifecycle";

const RepairSchema = z.object({
  client: z.string().min(2, "Nazwa klienta jest za krótka"),
  item: z.string().min(2, "Nazwa urządzenia jest za krótka"),
  serial: z.string().optional(),
  description: z.string().max(3000).optional(),
});

type RepairRecord = {
  id: string
  status?: string
  [key: string]: unknown
}

export type ActionState =
  | { success: true; message: string; data?: any }
  | { success: false; error: string };

async function requireAdminAction() {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) {
    return { success: false as const, error: "Brak uprawnień administratora." };
  }
  return null;
}

export async function addRepairAction(formData: FormData): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  const rawData = {
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
    const newRepair = await mutateMockData((db) => {
      const repairs = db.repairs as RepairRecord[]
      const repair: RepairRecord = {
        ...validated.data,
        id: `RMA-${crypto.randomUUID()}`,
        date: new Date().toISOString().split("T")[0],
        status: "WERYFIKACJA"
      }
      repairs.unshift(repair)
      return repair
    })

    revalidatePath("/admin/repairs");
    return { success: true, message: "Zgłoszenie zostało dodane.", data: newRepair };
  } catch {
    return { success: false, error: "Wystąpił błąd podczas dodawania zgłoszenia." };
  }
}

export async function deleteRepairAction(id: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    await mutateMockData((db) => {
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

export async function updateStatusAction(id: string, status: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  if (!id.trim()) {
    return { success: false, error: "Brak identyfikatora zgłoszenia." };
  }

  try {
    await mutateMockData((db) => {
      const repairs = db.repairs as RepairRecord[]
      const repair = repairs.find((entry) => entry.id === id)
      if (!repair) throw new Error("REPAIR_NOT_FOUND")

      const transition = validateRepairStatusTransition(repair.status, status)
      if (transition === "invalid-status") {
        throw new Error("REPAIR_INVALID_STATUS")
      }
      if (transition === "terminal-status") {
        throw new Error("REPAIR_TERMINAL_STATUS")
      }

      repair.status = status as RepairStatus
    })

    revalidatePath("/admin/repairs");
    return { success: true, message: `Status zmieniony na ${status}` };
  } catch (error) {
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
    return { success: false, error: "Błąd serwera." };
  }
}
