// src/app/admin/categories/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAPI } from "@/lib/authUtils";
import { mutateMockData } from "@/store/serverStore";

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

type CategoryRecord = {
  id: string
  name: string
  iconName?: string
  subcategories?: Array<{ id: string; name: string }>
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

export async function addCategoryAction(name: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;
  if (!name.trim()) return { success: false, error: "Nazwa kategorii nie może być pusta" };

  try {
    const newCat = await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const category: CategoryRecord = {
        id: `c${Date.now()}`,
        name: name.trim().toUpperCase(),
        iconName: "Folder",
        subcategories: []
      }
      categories.push(category)
      return category
    })

    revalidatePath("/admin/categories");
    return { success: true, message: "Kategoria została dodana", data: newCat };
  } catch {
    return { success: false, error: "Błąd podczas dodawania kategorii" };
  }
}

export async function updateCategoryAction(data: z.infer<typeof CategoryUpdateSchema>): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;
  const validated = CategoryUpdateSchema.safeParse(data);
  if (!validated.success) return { success: false, error: "Nieprawidłowe dane" };

  try {
    await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const idx = categories.findIndex((category) => category.id === validated.data.id)
      if (idx === -1) throw new Error("CATEGORY_NOT_FOUND")

      categories[idx] = {
        ...categories[idx],
        ...validated.data,
        name: validated.data.name
          ? validated.data.name.toUpperCase()
          : categories[idx].name
      }
    })

    revalidatePath("/admin/categories");
    return { success: true, message: "Zmiany zostały zapisane" };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    return { success: false, error: "Błąd podczas aktualizacji" };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const idx = categories.findIndex((category) => category.id === id)
      if (idx === -1) throw new Error("CATEGORY_NOT_FOUND")
      categories.splice(idx, 1)
    })

    revalidatePath("/admin/categories");
    return { success: true, message: "Kategoria została usunięta" };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    return { success: false, error: "Błąd podczas usuwania" };
  }
}
