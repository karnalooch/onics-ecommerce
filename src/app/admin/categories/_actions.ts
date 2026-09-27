// src/app/admin/categories/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAPI } from "@/lib/authUtils";
import { mutateMockData } from "@/store/serverStore";
import {
  hasCatalogCategoryNameConflict,
  hasCatalogSubcategoryNameConflict,
  hasCategoryProductReference,
  hasSubcategoryProductReference,
  indexCatalogCategoriesByName,
  indexCatalogSubcategoriesByName,
  isCatalogCategoryCreateReplay,
  normalizeCatalogCategoryName,
  normalizeCatalogSubcategoryName,
  type CatalogCategoryReference,
} from "@/lib/catalog";

const CategoryUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  iconName: z.string().trim().max(80).optional(),
});

const AddSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

const RenameSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

const DeleteSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1),
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
    const submission = await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const byName = indexCatalogCategoriesByName(categories)
      const existing = byName.get(normalizeCatalogCategoryName(name))
      if (existing) {
        if (
          !isCatalogCategoryCreateReplay(existing, {
            name,
            iconName: "Folder",
            subcategories: [],
          })
        ) {
          throw new Error("CATEGORY_NAME_EXISTS")
        }
        return { category: existing, replayed: true }
      }

      const category: CategoryRecord = {
        id: `c_${crypto.randomUUID()}`,
        name: name.trim().toUpperCase(),
        iconName: "Folder",
        subcategories: []
      }
      categories.push(category)
      return { category, replayed: false }
    })

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: submission.replayed
        ? "Kategoria już istnieje"
        : "Kategoria została dodana",
      data: submission.category
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CATEGORY_NAME_EXISTS"
    ) {
      return {
        success: false,
        error: "Kategoria o tej nazwie już istnieje z inną konfiguracją."
      };
    }
    if (
      error instanceof Error &&
      error.message === "CATALOG_DUPLICATE_CATEGORY_NAME"
    ) {
      return {
        success: false,
        error:
          "Katalog zawiera zduplikowane nazwy kategorii. Usuń konflikt przed kolejną zmianą."
      };
    }
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

      indexCatalogCategoriesByName(categories)
      if (
        validated.data.name &&
        hasCatalogCategoryNameConflict(
          categories,
          validated.data.name,
          validated.data.id
        )
      ) {
        throw new Error("CATEGORY_NAME_EXISTS")
      }

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
    if (
      error instanceof Error &&
      error.message === "CATEGORY_NAME_EXISTS"
    ) {
      return {
        success: false,
        error: "Kategoria o tej nazwie już istnieje"
      };
    }
    if (
      error instanceof Error &&
      error.message === "CATALOG_DUPLICATE_CATEGORY_NAME"
    ) {
      return {
        success: false,
        error:
          "Katalog zawiera zduplikowane nazwy kategorii. Usuń konflikt przed kolejną zmianą."
      };
    }
    if (
      error instanceof Error &&
      error.message === "CATEGORY_SUBCATEGORY_IN_USE"
    ) {
      return {
        success: false,
        error:
          "Nie można usunąć podkategorii przypisanej do produktu. Najpierw przenieś produkty."
      };
    }
    return { success: false, error: "Błąd podczas aktualizacji" };
  }
}

export async function addSubcategoryAction(
  categoryId: string,
  name: string
): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  const validated = AddSubcategorySchema.safeParse({ categoryId, name });
  if (!validated.success) {
    return { success: false, error: "Nieprawidłowa nazwa podkategorii" };
  }

  try {
    const submission = await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const category = categories.find(
        (candidate) => candidate.id === validated.data.categoryId
      )
      if (!category) throw new Error("CATEGORY_NOT_FOUND")

      const subcategories = category.subcategories || []
      const byName = indexCatalogSubcategoriesByName(subcategories)
      const existing = byName.get(
        normalizeCatalogSubcategoryName(validated.data.name)
      )
      if (existing) {
        return { subcategory: existing, replayed: true }
      }

      const subcategory = {
        id: `s_${crypto.randomUUID()}`,
        name: validated.data.name,
      }
      subcategories.push(subcategory)
      category.subcategories = subcategories
      return { subcategory, replayed: false }
    })

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: submission.replayed
        ? "Podkategoria już istnieje"
        : "Podkategoria została dodana",
      data: submission.subcategory,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    if (code === "CATALOG_DUPLICATE_SUBCATEGORY_NAME") {
      return {
        success: false,
        error:
          "Kategoria zawiera zduplikowane nazwy podkategorii. Usuń konflikt przed kolejną zmianą."
      };
    }
    return { success: false, error: "Błąd podczas dodawania podkategorii" };
  }
}

export async function renameSubcategoryAction(
  categoryId: string,
  subcategoryId: string,
  name: string
): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  const validated = RenameSubcategorySchema.safeParse({
    categoryId,
    subcategoryId,
    name,
  });
  if (!validated.success) {
    return { success: false, error: "Nieprawidłowa podkategoria" };
  }

  try {
    const updated = await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const category = categories.find(
        (candidate) => candidate.id === validated.data.categoryId
      )
      if (!category) throw new Error("CATEGORY_NOT_FOUND")

      const subcategories = category.subcategories || []
      indexCatalogSubcategoriesByName(subcategories)
      const subcategory = subcategories.find(
        (candidate) => candidate.id === validated.data.subcategoryId
      )
      if (!subcategory) throw new Error("SUBCATEGORY_NOT_FOUND")

      if (
        hasCatalogSubcategoryNameConflict(
          subcategories,
          validated.data.name,
          validated.data.subcategoryId
        )
      ) {
        throw new Error("SUBCATEGORY_NAME_EXISTS")
      }

      subcategory.name = validated.data.name
      return subcategory
    })

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: "Nazwa podkategorii została zaktualizowana",
      data: updated,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    if (code === "SUBCATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono podkategorii" };
    }
    if (code === "SUBCATEGORY_NAME_EXISTS") {
      return {
        success: false,
        error: "Podkategoria o tej nazwie już istnieje",
      };
    }
    if (code === "CATALOG_DUPLICATE_SUBCATEGORY_NAME") {
      return {
        success: false,
        error:
          "Kategoria zawiera zduplikowane nazwy podkategorii. Usuń konflikt przed kolejną zmianą."
      };
    }
    return { success: false, error: "Błąd podczas zmiany podkategorii" };
  }
}

export async function deleteSubcategoryAction(
  categoryId: string,
  subcategoryId: string
): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  const validated = DeleteSubcategorySchema.safeParse({
    categoryId,
    subcategoryId,
  });
  if (!validated.success) {
    return { success: false, error: "Nieprawidłowa podkategoria" };
  }

  try {
    const result = await mutateMockData((db) => {
      const categories = db.categories as CategoryRecord[]
      const category = categories.find(
        (candidate) => candidate.id === validated.data.categoryId
      )
      if (!category) throw new Error("CATEGORY_NOT_FOUND")

      const subcategories = category.subcategories || []
      const index = subcategories.findIndex(
        (candidate) => candidate.id === validated.data.subcategoryId
      )
      if (index === -1) {
        return { replayed: true }
      }

      if (
        hasSubcategoryProductReference(
          db.products as CatalogCategoryReference[],
          validated.data.categoryId,
          validated.data.subcategoryId
        )
      ) {
        throw new Error("SUBCATEGORY_IN_USE")
      }

      subcategories.splice(index, 1)
      category.subcategories = subcategories
      return { replayed: false }
    })

    revalidatePath("/admin/categories");
    return {
      success: true,
      message: result.replayed
        ? "Podkategoria była już usunięta"
        : "Podkategoria została usunięta",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    if (code === "SUBCATEGORY_IN_USE") {
      return {
        success: false,
        error:
          "Nie można usunąć podkategorii przypisanej do produktu. Najpierw przenieś produkty.",
      };
    }
    return { success: false, error: "Błąd podczas usuwania podkategorii" };
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
      if (
        hasCategoryProductReference(
          db.products as CatalogCategoryReference[],
          id
        )
      ) {
        throw new Error("CATEGORY_IN_USE")
      }
      categories.splice(idx, 1)
    })

    revalidatePath("/admin/categories");
    return { success: true, message: "Kategoria została usunięta" };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    if (error instanceof Error && error.message === "CATEGORY_IN_USE") {
      return {
        success: false,
        error:
          "Nie można usunąć kategorii przypisanej do produktów. Najpierw przenieś produkty."
      };
    }
    return { success: false, error: "Błąd podczas usuwania" };
  }
}
