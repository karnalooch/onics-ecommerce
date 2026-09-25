// src/app/admin/categories/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { z } from "zod";
import { initializeMockData, saveMockData } from "@/store/serverStore";

const SubcategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1)
});

const CategoryUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  iconName: z.string().optional(),
  subcategories: z.array(SubcategorySchema).optional()
});

export type ActionState = 
  | { success: true; message: string; data?: any }
  | { success: false; error: string };
async function requireAdminAction() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "ADMIN") {
    return { success: false as const, error: "Brak uprawnień administratora." };
  }
  return null;
}


/**
 * Dodaje nową kategorię główną
 */
export async function addCategoryAction(name: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;
  if (!name.trim()) return { success: false, error: "Nazwa kategorii nie może być pusta" };
  
  try {
    const { categories } = initializeMockData();
    const newCat = {
      id: `c${Date.now()}`,
      name: name.trim().toUpperCase(),
      iconName: "Folder",
      subcategories: []
    };
    categories.push(newCat);
    if (!saveMockData()) return { success: false, error: "Nie udało się zapisać kategorii" };
    revalidatePath("/admin/categories");
    return { success: true, message: "Kategoria została dodana", data: newCat };
  } catch (e) {
    return { success: false, error: "Błąd podczas dodawania kategorii" };
  }
}

/**
 * Aktualizuje dane kategorii (nazwa, ikona, subkategorie)
 */
export async function updateCategoryAction(data: z.infer<typeof CategoryUpdateSchema>): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;
  const validated = CategoryUpdateSchema.safeParse(data);
  if (!validated.success) return { success: false, error: "Nieprawidłowe dane" };

  try {
    const { categories } = initializeMockData();
    const idx = categories.findIndex((c: any) => c.id === validated.data.id);
    if (idx === -1) return { success: false, error: "Nie znaleziono kategorii" };

    categories[idx] = { 
      ...categories[idx], 
      ...validated.data,
      // Jeśli nazwa jest aktualizowana, upewnij się że jest UPPERCASE dla kategorii głównej
      name: validated.data.name ? validated.data.name.toUpperCase() : categories[idx].name
    };

    if (!saveMockData()) return { success: false, error: "Nie udało się zapisać kategorii" };
    revalidatePath("/admin/categories");
    return { success: true, message: "Zmiany zostały zapisane" };
  } catch (e) {
    return { success: false, error: "Błąd podczas aktualizacji" };
  }
}

/**
 * Usuwa kategorię główną
 */
export async function deleteCategoryAction(id: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;
  try {
    const { categories } = initializeMockData();
    const idx = categories.findIndex((c: any) => c.id === id);
    if (idx === -1) return { success: false, error: "Nie znaleziono kategorii" };

    categories.splice(idx, 1);
    if (!saveMockData()) return { success: false, error: "Nie udało się zapisać zmian" };
    revalidatePath("/admin/categories");
    return { success: true, message: "Kategoria została usunięta" };
  } catch (e) {
    return { success: false, error: "Błąd podczas usuwania" };
  }
}
