// src/app/admin/products/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAPI } from "@/lib/authUtils";
import { mutateMockData } from "@/store/serverStore";
import { buildKnowledgeFromDb, saveKnowledge, checkQuality } from "@/lib/knowledge/parser";
import { findBestKnowledgeMatch } from "@/lib/knowledge/matcher";

/**
 * Całkowite wyczyszczenie Centralnego Rejestru Towarowego
 * Usuwa wszystkie produkty (Ewidencja + Katalog AI)
 */
export async function wipeRegistryAction(): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    await mutateMockData((db) => {
      db.products.splice(0, db.products.length);
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return {
      success: true,
      message: "Centralny Rejestr Towarowy został całkowicie wyczyszczony."
    };
  } catch {
    return { success: false, error: "Błąd podczas czyszczenia rejestru" };
  }
}

// wipeInventoryAction removed as part of unification

const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU jest wymagane"),
  name: z.string().min(3, "Nazwa jest za krótka"),
  price: z.number().min(0),
  stock: z.number().min(0),
  manufacturer: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  seoDescription: z.string().optional(),
  catalogPrice: z.number().optional(),
  catalogSpecs: z.string().optional(),
  priceMismatch: z.boolean().optional(),
});

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


/**
 * Dodaje lub aktualizuje pojedynczy produkt
 */
export async function saveProductAction(data: any): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  const validated = ProductSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const result = await mutateMockData((db) => {
      const products = db.products as any[];
      const existingIdx = products.findIndex((product) => product.id === data.id);

      if (existingIdx !== -1) {
        products[existingIdx] = { ...products[existingIdx], ...validated.data };
        return { created: false, product: products[existingIdx] };
      }

      const newProduct = {
        ...validated.data,
        id: `p_${crypto.randomUUID()}`,
        seoDescription: validated.data.seoDescription || ""
      };
      products.push(newProduct);
      return { created: true, product: newProduct };
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return result.created
      ? { success: true, message: "Produkt dodany", data: result.product }
      : { success: true, message: "Produkt zaktualizowany" };
  } catch {
    return { success: false, error: "Błąd zapisu produktu" };
  }
}

/**
 * Usuwa produkt
 */
export async function deleteProductAction(id: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    await mutateMockData((db) => {
      const products = db.products as any[];
      const idx = products.findIndex((product) => product.id === id);
      if (idx === -1) throw new Error("PRODUCT_NOT_FOUND");
      products.splice(idx, 1);
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return { success: true, message: "Produkt usunięty" };
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono produktu" };
    }
    return { success: false, error: "Błąd podczas usuwania" };
  }
}

/**
 * Masowy import z WF-Mag (Biurko Klasyfikacyjne)
 */
export async function importProductsAction(items: any[]): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const result = await mutateMockData((db) => {
      const products = db.products as any[];
      const categories = db.categories as any[];
      let updatedCount = 0;
      let addedCount = 0;

      const junkWords = [
        "NIEZNANY", "INNE", "NIESKLASYFIKOWANE", "POZOSTAŁE",
        "MISC", "BRAK", "PRODUKT", "ARTYKUŁ", "NIEZNANA"
      ];
      const normalize = (value: any) =>
        String(value || "").replace(/\u00A0/g, " ").trim();
      const isJunk = (value: string) =>
        junkWords.includes(normalize(value).toUpperCase());
      const getDirectMatch = (name: string, list: any[]) => {
        const normalized = normalize(name).toLowerCase();
        if (!normalized || isJunk(normalized)) return null;
        return list.find(
          (item) => normalize(item.name).toLowerCase() === normalized
        );
      };

      items.forEach((item: any) => {
        const normalizedSku = normalize(item.sku).toLowerCase();
        if (!normalizedSku) return;

        const existing = products.find(
          (product) => normalize(product.sku).toLowerCase() === normalizedSku
        );

        let finalCategoryId = item.categoryId;
        let finalSubcategoryId = item.subcategoryId;

        if (
          !finalCategoryId &&
          item.xlsCategoryName &&
          !isJunk(item.xlsCategoryName)
        ) {
          let category = getDirectMatch(item.xlsCategoryName, categories);
          if (!category && item.isNewCategory) {
            category = {
              id: `cat_${crypto.randomUUID()}`,
              name: normalize(item.xlsCategoryName).toUpperCase(),
              iconName: "Layers",
              subcategories: []
            };
            categories.push(category);
          }
          if (category) finalCategoryId = category.id;
        }

        if (
          !finalSubcategoryId &&
          item.xlsSubcategoryName &&
          finalCategoryId &&
          !isJunk(item.xlsSubcategoryName)
        ) {
          const category = categories.find(
            (candidate) => candidate.id === finalCategoryId
          );
          if (category) {
            let subcategory = getDirectMatch(
              item.xlsSubcategoryName,
              category.subcategories || []
            );
            if (!subcategory && item.isNewSubcategory) {
              subcategory = {
                id: `sub_${crypto.randomUUID()}`,
                name: normalize(item.xlsSubcategoryName)
              };
              category.subcategories ||= [];
              category.subcategories.push(subcategory);
            }
            if (subcategory) finalSubcategoryId = subcategory.id;
          }
        }

        if (existing) {
          existing.price = item.price;
          existing.stock = item.stock;
          existing.manufacturer = item.manufacturer || existing.manufacturer;
          if (item.specs) existing.specs = item.specs;
          if (finalCategoryId) {
            existing.categoryId = finalCategoryId;
            existing.subcategoryId = finalSubcategoryId;
          }
          updatedCount += 1;
        } else {
          products.push({
            id: `p_${crypto.randomUUID()}`,
            ...item,
            categoryId: finalCategoryId,
            subcategoryId: finalSubcategoryId,
            specs: item.specs || "",
            isIqSynced: Boolean(item.specs)
          });
          addedCount += 1;
        }
      });

      return { updatedCount, addedCount };
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      message:
        `Unified Import zakończony. Zaktualizowano/Aktywowano: ${result.updatedCount}, Dodano nowych: ${result.addedCount}`
    };
  } catch {
    return { success: false, error: "Błąd podczas masowego importu" };
  }
}

/**
 * Synchronizuje dane z importu z Bazą Wiedzy (Cennikami)
 */
export async function syncImportWithCatalogAction(items: any[]): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const result = await mutateMockData((db) => {
      const store = buildKnowledgeFromDb(db);
      const products = db.products as any[];
      let autoAddedCount = 0;

      const enriched = items
        .map((item) => {
          const match = findBestKnowledgeMatch(item.name || "", item.sku, store);
          let quality: { isClean: boolean; reason?: string } = {
            isClean: false,
            reason: "Brak danych w katalogu"
          };
          let catalogPrice = 0;
          let catalogSpecs = "";
          let priceMismatch = false;

          if (match) {
            catalogPrice = match.entry.price || 0;
            catalogSpecs = match.entry.specs || "";
            const wfMagPrice = Number(item.price || 0);
            priceMismatch = Math.abs(wfMagPrice - catalogPrice) > 0.01;
            quality = checkQuality({
              manufacturer: item.manufacturer || match.entry.manufacturer,
              category: item.xlsCategoryName || match.entry.category,
              subcategory: item.xlsSubcategoryName || match.entry.subcategory
            });
          }

          const enrichedItem = {
            ...item,
            catalogPrice,
            catalogSpecs,
            priceMismatch,
            qualityLevel: quality.isClean ? "HIGH" : "LOW",
            qualityReason: quality.reason || "",
            manufacturer: item.manufacturer || match?.entry.manufacturer || ""
          };

          if (quality.isClean && !priceMismatch) {
            const normalizedSku = String(item.sku || "").trim().toLowerCase();
            const existingIdx = products.findIndex(
              (product) =>
                String(product.sku || "").trim().toLowerCase() === normalizedSku
            );
            const iqData = {
              catalogPrice: match?.entry.price || 0,
              catalogSpecs: match?.entry.specs || "",
              manufacturer: item.manufacturer || match?.entry.manufacturer,
              isIqSynced: true
            };

            if (existingIdx !== -1) {
              products[existingIdx] = {
                ...products[existingIdx],
                ...enrichedItem,
                ...iqData,
                isAutoSynced: true
              };
            } else {
              products.push({
                id: `p_auto_${crypto.randomUUID()}`,
                ...enrichedItem,
                ...iqData,
                isAutoSynced: true
              });
            }
            autoAddedCount += 1;
            return null;
          }

          return enrichedItem;
        })
        .filter(Boolean);

      return { autoAddedCount, enriched };
    });

    return {
      success: true,
      message:
        result.autoAddedCount > 0
          ? `Zsynchronizowano. Dodano/Zaktualizowano automatycznie: ${result.autoAddedCount}. Reszta (${result.enriched.length}) wymaga uwagi na Biurku.`
          : "Synchronizacja zakończona. Wszystkie pozycje wymagają weryfikacji.",
      data: result.enriched
    };
  } catch {
    return { success: false, error: "Błąd podczas synchronizacji z katalogiem" };
  }
}

/**
 * Generuje opis AI dla produktu
 */
export async function generateAiDescriptionAction(productId: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const result = await mutateMockData((db) => {
      const products = db.products as any[];
      const product = products.find((entry) => entry.id === productId);
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      let technicalContext = "";
      try {
        const localStore = buildKnowledgeFromDb(db);
        const match = findBestKnowledgeMatch(
          String(product.name || ""),
          String(product.sku || ""),
          localStore
        );
        if (match) technicalContext = match.entry.specs;
      } catch {}

      const generatedDescription =
        technicalContext || String(product.seoDescription || "");
      if (!generatedDescription) throw new Error("KNOWLEDGE_NOT_FOUND");

      product.seoDescription = generatedDescription;
      product.isIqSynced = true;
      return generatedDescription;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return {
      success: true,
      message: "Opis został zaimportowany z Bazy Wiedzy IQ",
      data: result
    };
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono produktu" };
    }
    if (error instanceof Error && error.message === "KNOWLEDGE_NOT_FOUND") {
      return { success: false, error: "Brak opisu w Bazie Wiedzy IQ" };
    }
    return { success: false, error: "Błąd generatora AI" };
  }
}

/**
 * Ręczne parowanie produktu z Inteligencją IQ Hub
 */
export async function syncProductWithIqAction(productId: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const product = await mutateMockData((db) => {
      const products = db.products as any[];
      const current = products.find((entry) => entry.id === productId);
      if (!current) throw new Error("PRODUCT_NOT_FOUND");

      const store = buildKnowledgeFromDb(db);
      const match = findBestKnowledgeMatch(
        String(current.name || ""),
        String(current.sku || ""),
        store
      );
      if (!match) throw new Error("IQ_NOT_FOUND");

      current.catalogPrice = match.entry.price || 0;
      current.catalogSpecs = match.entry.specs || "";
      current.description = match.entry.specs || "";
      current.seoDescription = match.entry.specs || "";
      current.manufacturer =
        current.manufacturer || match.entry.manufacturer || "";
      current.isIqSynced = true;
      return { ...current };
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return {
      success: true,
      message:
        `Produkt zsynchronizowany z IQ Hub. Wykryto MSRP: ${product.catalogPrice} PLN.`,
      data: product
    };
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono produktu" };
    }
    if (error instanceof Error && error.message === "IQ_NOT_FOUND") {
      return {
        success: false,
        error: "Brak wzorca technicznego w IQ Hub dla tego urządzenia"
      };
    }
    return { success: false, error: "Błąd podczas synchronizacji IQ" };
  }
}

/**
 * Promuje urządzenie wirtualne (z katalogu IQ) do fizycznej ewidencji
 */
export async function activateVirtualProductAction(sku: string): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const newProduct = await mutateMockData((db) => {
      const store = buildKnowledgeFromDb(db);
      const entry = store.knowledge[sku];
      if (!entry) throw new Error("IQ_NOT_FOUND");

      const products = db.products as any[];
      const categories = db.categories as any[];
      if (
        products.some(
          (product) =>
            String(product.sku || "").trim().toLowerCase() ===
            sku.trim().toLowerCase()
        )
      ) {
        throw new Error("PRODUCT_EXISTS");
      }

      let mappedCatId = null;
      let mappedSubId = null;

      if (entry.category) {
        const category = categories.find(
          (candidate) =>
            String(candidate.name || "").toLowerCase().trim() ===
            entry.category?.toLowerCase().trim()
        );
        if (category) {
          mappedCatId = category.id;
          if (entry.subcategory) {
            const subcategory = (category.subcategories || []).find(
              (candidate: any) =>
                String(candidate.name || "").toLowerCase().trim() ===
                entry.subcategory?.toLowerCase().trim()
            );
            if (subcategory) mappedSubId = subcategory.id;
          }
        }
      }

      const product = {
        id: `p_${crypto.randomUUID()}`,
        sku,
        name: entry.model || sku,
        manufacturer: entry.manufacturer || "",
        price: entry.price || 0,
        catalogPrice: entry.price || 0,
        stock: 0,
        specs: entry.specs || "",
        isIqSynced: true,
        categoryId: mappedCatId,
        subcategoryId: mappedSubId
      };
      products.push(product);
      return product;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return {
      success: true,
      message: `Urządzenie ${sku} zostało aktywowane w ewidencji.`,
      data: newProduct
    };
  } catch (error) {
    if (error instanceof Error && error.message === "IQ_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono wzorca w Bazie Wiedzy" };
    }
    if (error instanceof Error && error.message === "PRODUCT_EXISTS") {
      return { success: false, error: "Produkt o tym SKU jest już aktywny" };
    }
    return { success: false, error: "Błąd podczas aktywacji urządzenia" };
  }
}

/**
 * Masowe dodawanie produktów bezpośrednio do ewidencji (Baza produktów)
 */
export async function bulkAddProductsToInventoryAction(items: any[]): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const added = await mutateMockData((db) => {
      const products = db.products as any[];
      let count = 0;

      items.forEach((item) => {
        const sku = String(item.sku || "").trim().toLowerCase();
        if (!sku) return;

        const exists = products.find(
          (product) =>
            String(product.sku || "").trim().toLowerCase() === sku
        );
        if (exists) return;

        products.push({
          id: `p_direct_${crypto.randomUUID()}`,
          ...item,
          stock: item.stock || 0,
          price: item.price || 0,
          seoDescription: item.seoDescription || item.catalogSpecs || ""
        });
        count += 1;
      });

      return count;
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      message: `Dodano ${added} produktów bezpośrednio do bazy.`
    };
  } catch {
    return { success: false, error: "Błąd podczas masowego zasilania bazy" };
  }
}

/**
 * Inteligentne zarządzanie strukturą (Kategorie / Producenci)
 * IMPLEMENTACJA: Usuwanie przenosi produkty na BIURKO (Safety First)
 */
export async function manageStructureAction(
  type: "category" | "subcategory" | "manufacturer",
  action: "update" | "delete",
  id: string,
  data?: any
): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const result = await mutateMockData((db) => {
      const categories = db.categories as any[];
      const manufacturers = db.manufacturers as any[];
      const products = db.products as any[];

      if (type === "manufacturer") {
        const idx = manufacturers.findIndex((item) => item.id === id);
        if (idx === -1) throw new Error("MANUFACTURER_NOT_FOUND");

        if (action === "delete") {
          const manufacturerName = manufacturers[idx].name;
          const orphanedProducts = products.filter(
            (product) => product.manufacturer === manufacturerName
          );
          const orphanedIds = new Set(
            orphanedProducts.map((product) => product.id)
          );
          for (let index = products.length - 1; index >= 0; index -= 1) {
            if (orphanedIds.has(products[index].id)) products.splice(index, 1);
          }
          manufacturers.splice(idx, 1);

          return {
            revalidateProducts: true,
            state: {
              success: true as const,
              message:
                `Producent ${manufacturerName} usunięty. ${orphanedProducts.length} produktów trafiło na Biurko do ponownej klasyfikacji.`,
              data: orphanedProducts.map((product) => ({
                ...product,
                tempId: `orphaned_${product.id}`,
                qualityLevel: "LOW",
                qualityReason: `Usunięto producenta: ${manufacturerName}`
              }))
            }
          };
        }

        if (action === "update" && data?.name) {
          const oldName = manufacturers[idx].name;
          manufacturers[idx].name = data.name;
          products.forEach((product) => {
            if (product.manufacturer === oldName) {
              product.manufacturer = data.name;
            }
          });
          return {
            revalidateProducts: false,
            state: {
              success: true as const,
              message: "Nazwa producenta zaktualizowana globalnie"
            }
          };
        }
      }

      if (type === "category") {
        const idx = categories.findIndex((item) => item.id === id);
        if (idx === -1) throw new Error("CATEGORY_NOT_FOUND");

        if (action === "delete") {
          const categoryName = categories[idx].name;
          const orphanedProducts = products.filter(
            (product) => product.categoryId === id
          );
          const orphanedIds = new Set(
            orphanedProducts.map((product) => product.id)
          );
          for (let index = products.length - 1; index >= 0; index -= 1) {
            if (orphanedIds.has(products[index].id)) products.splice(index, 1);
          }
          categories.splice(idx, 1);

          return {
            revalidateProducts: true,
            state: {
              success: true as const,
              message:
                `Kategoria ${categoryName} usunięta. ${orphanedProducts.length} produktów trafiło na Biurko.`,
              data: orphanedProducts.map((product) => ({
                ...product,
                tempId: `orphaned_${product.id}`,
                categoryId: null,
                subcategoryId: null,
                qualityLevel: "LOW",
                qualityReason: `Usunięto kategorię: ${categoryName}`
              }))
            }
          };
        }

        if (action === "update" && data?.name) {
          categories[idx].name = data.name;
          return {
            revalidateProducts: false,
            state: {
              success: true as const,
              message: "Kategoria zaktualizowana"
            }
          };
        }
      }

      throw new Error("UNSUPPORTED_STRUCTURE_ACTION");
    });

    if (result.revalidateProducts) revalidatePath("/admin/products");
    return result.state;
  } catch (error) {
    if (error instanceof Error && error.message === "MANUFACTURER_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono producenta" };
    }
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { success: false, error: "Nie znaleziono kategorii" };
    }
    if (
      error instanceof Error &&
      error.message === "UNSUPPORTED_STRUCTURE_ACTION"
    ) {
      return { success: false, error: "Nieobsługiwany typ lub akcja" };
    }
    return { success: false, error: "Błąd podczas zarządzania strukturą" };
  }
}

/**
 * AUTONOMICZNY PROVISIONING (Neural Sieve V16.2)
 * Automatycznie tworzy brakujące byty i decyduje: Baza czy Biurko.
 */
export async function autonomousProvisioningAction(extractions: any[]): Promise<ActionState> {
  const accessError = await requireAdminAction();
  if (accessError) return accessError;

  try {
    const result = await mutateMockData((db) => {
      const categories = db.categories as any[];
      const manufacturers = db.manufacturers as any[];
      const products = db.products as any[];
      let directCount = 0;
      const quarantined: any[] = [];

      const getFuzzyMatch = (name: string, list: any[]) => {
        const normalized = (name || "").toLowerCase().trim();
        if (!normalized || normalized === "inne" || normalized === "nieznana") {
          return null;
        }
        return (
          list.find(
            (item) =>
              String(item.name || "").toLowerCase().trim() === normalized
          ) ||
          list.find((item) =>
            String(item.name || "").toLowerCase().trim().includes(normalized)
          ) ||
          list.find((item) =>
            normalized.includes(String(item.name || "").toLowerCase().trim())
          )
        );
      };

      extractions.forEach((entry) => {
        let finalCatId = null;
        let finalSubId = null;

        if (entry.category) {
          let category = getFuzzyMatch(entry.category, categories);
          if (!category) {
            category = {
              id: `c_auto_${crypto.randomUUID()}`,
              name: entry.category.toUpperCase().trim(),
              iconName: "Layers",
              subcategories: []
            };
            categories.push(category);
          }
          finalCatId = category.id;

          if (entry.subcategory) {
            let subcategory = getFuzzyMatch(
              entry.subcategory,
              category.subcategories || []
            );
            if (!subcategory) {
              subcategory = {
                id: `s_auto_${crypto.randomUUID()}`,
                name: entry.subcategory.trim()
              };
              category.subcategories ||= [];
              category.subcategories.push(subcategory);
            }
            finalSubId = subcategory.id;
          }
        }

        if (
          entry.manufacturer &&
          entry.manufacturer !== "BRAK" &&
          entry.manufacturer !== "Brak"
        ) {
          const normalizedManufacturer = entry.manufacturer.toLowerCase().trim();
          const manufacturer = manufacturers.find(
            (candidate) =>
              String(candidate.name || "").toLowerCase().trim() ===
              normalizedManufacturer
          );
          if (!manufacturer) {
            manufacturers.push({
              id: `m_auto_${crypto.randomUUID()}`,
              name: entry.manufacturer.trim()
            });
          }
        }

        const quality = checkQuality(entry);
        if (quality.isClean) {
          const sku = String(entry.model || "").trim();
          const exists = products.find((product) => product.sku === sku);
          if (!exists) {
            products.push({
              id: `p_${crypto.randomUUID()}`,
              sku,
              name: entry.model,
              manufacturer: entry.manufacturer,
              price: entry.price || 0,
              stock: 0,
              description:
                entry.specs ||
                "Automatyczna specyfikacja techniczna w przygotowaniu.",
              catalogPrice: entry.price || 0,
              catalogSpecs: entry.specs || "",
              seoDescription: entry.specs || "",
              categoryId: finalCatId,
              subcategoryId: finalSubId,
              isIqSynced: true
            });
            directCount += 1;
          }
        } else {
          quarantined.push({
            ...entry,
            tempId: `q_${crypto.randomUUID()}`,
            sku: entry.model || "BRAK SKU",
            name: entry.model || "NIEZNANY MODEL",
            qualityLevel: "LOW",
            qualityReason: quality.reason,
            categoryId: finalCatId,
            subcategoryId: finalSubId
          });
        }
      });

      return { directCount, quarantined };
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    return {
      success: true,
      message:
        `Neural Sieve zakończył operację. Autonomicznie dodano: ${result.directCount}. Produkty wymagające uwagi: ${result.quarantined.length}.`,
      data: result.quarantined
    };
  } catch {
    return {
      success: false,
      error: "Błąd podczas autonomicznego provisioningu"
    };
  }
}
