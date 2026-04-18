// src/app/admin/repairs/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { initializeMockData } from "@/store/serverStore";

const RepairSchema = z.object({
  client: z.string().min(2, "Nazwa klienta jest za krótka"),
  item: z.string().min(2, "Nazwa urządzenia jest za krótka"),
  serial: z.string().optional(),
});

export type ActionState = 
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Dodaje nowe zgłoszenie RMA
 */
export async function addRepairAction(formData: FormData): Promise<ActionState> {
  const rawData = {
    client: formData.get("client"),
    item: formData.get("item"),
    serial: formData.get("serial") || "N/A",
  };

  const validated = RepairSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  try {
    const { repairs } = initializeMockData();
    const newId = `RMA-${Math.floor(Math.random() * 9000) + 1000}`;
    const date = new Date().toISOString().split('T')[0];
    
    repairs.unshift({
      ...validated.data,
      id: newId,
      date,
      status: "WERYFIKACJA"
    });

    revalidatePath("/admin/repairs");
    return { success: true, message: "Zgłoszenie zostało dodane." };
  } catch (e) {
    return { success: false, error: "Wystąpił błąd podczas dodawania zgłoszenia." };
  }
}

/**
 * Usuwa zgłoszenie RMA
 */
export async function deleteRepairAction(id: string): Promise<ActionState> {
  try {
    const { repairs } = initializeMockData();
    const index = repairs.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      repairs.splice(index, 1);
      revalidatePath("/admin/repairs");
      return { success: true, message: "Zgłoszenie usunięte." };
    }
    return { success: false, error: "Nie znaleziono zgłoszenia." };
  } catch (e) {
    return { success: false, error: "Błąd serwera." };
  }
}

/**
 * Aktualizuje status zgłoszenia RMA
 */
export async function updateStatusAction(id: string, status: string): Promise<ActionState> {
  try {
    const { repairs } = initializeMockData();
    const repair = repairs.find((r: any) => r.id === id);
    if (repair) {
      repair.status = status;
      revalidatePath("/admin/repairs");
      return { success: true, message: `Status zmieniony na ${status}` };
    }
    return { success: false, error: "Nie znaleziono zgłoszenia." };
  } catch (e) {
    return { success: false, error: "Błąd serwera." };
  }
}
