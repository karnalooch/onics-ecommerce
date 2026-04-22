// src/app/admin/products/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { initializeMockData, saveMockData } from "@/store/serverStore";
import { getKnowledge, saveKnowledge, checkQuality } from "@/lib/knowledge/parser";
import { findBestKnowledgeMatch } from "@/lib/knowledge/matcher";

/**
 * Całkowite wyczyszczenie Centralnego Rejestru Towarowego
 * Usuwa wszystkie produkty (Ewidencja + Katalog AI)
 */
export async function wipeRegistryAction(): Promise<ActionState> {
  try {
    initializeMockData();
    (global as any).mockProductsStore = []; // Absolute purge
    saveMockData();
    
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    
    return { success: true, message: "Centralny Rejestr Towarowy został całkowicie wyczyszczony." };
  } catch (e) {
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

/**
 * Dodaje lub aktualizuje pojedynczy produkt
 */
export async function saveProductAction(data: any): Promise<ActionState> {
  const validated = ProductSchema.safeParse(data);
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  try {
    const { products } = initializeMockData();
    const existingIdx = products.findIndex((p: any) => p.id === data.id);

    if (existingIdx !== -1) {
      products[existingIdx] = { ...products[existingIdx], ...validated.data };
      saveMockData(); // Persist to JSON
      revalidatePath("/admin/products");
      revalidatePath("/admin/catalog");
      return { success: true, message: "Produkt zaktualizowany" };
    } else {
      const newProduct = {
        ...validated.data,
        id: `p${Date.now()}`,
        seoDescription: validated.data.seoDescription || ""
      };
      products.push(newProduct);
      saveMockData(); // Persist to JSON
      revalidatePath("/admin/products");
      revalidatePath("/admin/catalog");
      return { success: true, message: "Produkt dodany", data: newProduct };
    }
  } catch (e) {
    return { success: false, error: "Błąd zapisu produktu" };
  }
}

/**
 * Usuwa produkt
 */
export async function deleteProductAction(id: string): Promise<ActionState> {
  try {
    const { products } = initializeMockData();
    const idx = products.findIndex((p: any) => p.id === id);
    if (idx !== -1) {
      products.splice(idx, 1);
      saveMockData(); // Persist to JSON
      revalidatePath("/admin/products");
      revalidatePath("/admin/catalog");
      return { success: true, message: "Produkt usunięty" };
    }
    return { success: false, error: "Nie znaleziono produktu" };
  } catch (e) {
    return { success: false, error: "Błąd podczas usuwania" };
  }
}

/**
 * Masowy import z WF-Mag (Biurko Klasyfikacyjne)
 */
export async function importProductsAction(items: any[]): Promise<ActionState> {
  try {
    const { products, categories } = initializeMockData();
    let updatedCount = 0;
    let addedCount = 0;

    const junkWords = ['NIEZNANY', 'INNE', 'NIESKLASYFIKOWANE', 'POZOSTAŁE', 'MISC', 'BRAK', 'PRODUKT', 'ARTYKUŁ', 'NIEZNANA'];
    const normalize = (s: any) => String(s || "").replace(/\u00A0/g, " ").trim();
    const isJunk = (str: string) => junkWords.includes(normalize(str).toUpperCase());

    items.forEach((im: any) => {
      const imSku = normalize(im.sku).toLowerCase();
      if (!imSku) return;

      const existing = products.find((p: any) => normalize(p.sku).toLowerCase() === imSku);

      let finalCategoryId = im.categoryId;
      let finalSubcategoryId = im.subcategoryId;

      // DIRECT MATCH ONLY (V24 ATOMIC SYNC)
      const getDirectMatch = (name: string, list: any[]) => {
        const n = normalize(name).toLowerCase();
        if (!n || isJunk(n)) return null;
        return list.find(item => normalize(item.name).toLowerCase() === n);
      };

      if (!finalCategoryId && im.xlsCategoryName && !isJunk(im.xlsCategoryName)) {
        const cat = getDirectMatch(im.xlsCategoryName, categories);
        if (cat) {
          finalCategoryId = cat.id;
        } else if (im.isNewCategory) {
          const newCat = { 
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
            name: normalize(im.xlsCategoryName).toUpperCase(), 
            iconName: "Layers", 
            subcategories: [] 
          };
          categories.push(newCat);
          finalCategoryId = newCat.id;
        }
      }

      if (!finalSubcategoryId && im.xlsSubcategoryName && finalCategoryId && !isJunk(im.xlsSubcategoryName)) {
        const cat = categories.find((c: any) => c.id === finalCategoryId);
        if (cat) {
          const sub = getDirectMatch(im.xlsSubcategoryName, cat.subcategories);
          if (sub) {
            finalSubcategoryId = sub.id;
          } else if (im.isNewSubcategory) {
            const newSub = { 
              id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
              name: im.xlsSubcategoryName.trim() 
            };
            cat.subcategories.push(newSub);
            finalSubcategoryId = newSub.id;
          }
        }
      }

      if (existing) {
        // UNIFIED FLOW (V17.0): Search in the master list first
        existing.price = im.price;
        existing.stock = im.stock;
        existing.manufacturer = im.manufacturer || existing.manufacturer;
        
        if (im.specs) {
          existing.specs = im.specs; // Use deduplicated field
        }
        
        if (finalCategoryId) {
          existing.categoryId = finalCategoryId;
          existing.subcategoryId = finalSubcategoryId;
        }
        updatedCount++;
      } else {
        // NEW ENTRY
        products.push({
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...im,
          categoryId: finalCategoryId,
          subcategoryId: finalSubcategoryId,
          specs: im.specs || "", // Use deduplicated field
          isIqSynced: !!im.specs
        });
        addedCount++;
      }
    });

    saveMockData(); // Persist to JSON
    revalidatePath("/admin/products");
    return { success: true, message: `Unified Import zakończony. Zaktualizowano/Aktywowano: ${updatedCount}, Dodano nowych: ${addedCount}` };
  } catch (e) {
    return { success: false, error: "Błąd podczas masowego importu" };
  }
}

/**
 * Synchronizuje dane z importu z Bazą Wiedzy (Cennikami)
 */
export async function syncImportWithCatalogAction(items: any[]): Promise<ActionState> {
  try {
    const store = await getKnowledge();
    
    const { products } = initializeMockData();
    let autoAddedCount = 0;
    
    const enriched = items.map(item => {
      const match = findBestKnowledgeMatch(item.name || '', item.sku, store);
      let quality: { isClean: boolean; reason?: string } = { isClean: false, reason: "Brak danych w katalogu" };
      let catalogPrice = 0;
      let catalogSpecs = "";
      let priceMismatch = false;

      if (match) {
        catalogPrice = match.entry.price || 0;
        catalogSpecs = match.entry.specs || "";
        const wfMagPrice = Number(item.price || 0);
        priceMismatch = Math.abs(wfMagPrice - catalogPrice) > 0.01;
        
        // Quality check based on extracted metadata or current item state
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
        qualityLevel: quality.isClean ? 'HIGH' : 'LOW',
        qualityReason: quality.reason || "",
        manufacturer: item.manufacturer || (match?.entry.manufacturer || ""),
      };

      // AUTO-COMMIT LOGIC (Shield V9.6)
      if (quality.isClean && !priceMismatch) {
        const imSku = String(item.sku || '').trim().toLowerCase();
        const existingIdx = products.findIndex((p: any) => String(p.sku || '').trim().toLowerCase() === imSku);
        
        const iqData = {
          catalogPrice: match?.entry.price || 0,
          catalogSpecs: match?.entry.specs || "",
          manufacturer: item.manufacturer || match?.entry.manufacturer,
          isIqSynced: true
        };

        if (existingIdx !== -1) {
          products[existingIdx] = { ...products[existingIdx], ...enrichedItem, ...iqData, isAutoSynced: true };
        } else {
          products.push({ 
            id: `p_auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            ...enrichedItem,
            ...iqData,
            isAutoSynced: true 
          });
        }
        autoAddedCount++;
        return null; // Remove from staging payload
      }

      return enrichedItem;
    }).filter(Boolean); // Filter out auto-committed items

    saveMockData(); // Persist to JSON
    
    return { 
      success: true, 
      message: autoAddedCount > 0 
        ? `Zsynchronizowano. Dodano/Zaktualizowano automatycznie: ${autoAddedCount}. Reszta (${enriched.length}) wymaga uwagi na Biurku.` 
        : "Synchronizacja zakończona. Wszystkie pozycje wymagają weryfikacji.", 
      data: enriched 
    };
  } catch (e) {
    return { success: false, error: "Błąd podczas synchronizacji z katalogiem" };
  }
}

/**
 * Generuje opis AI dla produktu
 */
export async function generateAiDescriptionAction(productId: string): Promise<ActionState> {
  try {
    const { products } = initializeMockData();
    const product = products.find((p: any) => p.id === productId);
    if (!product) return { success: false, error: "Nie znaleziono produktu" };

    const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
    let technicalContext = "";

    try {
      const localStore = await getKnowledge();
      const match = findBestKnowledgeMatch(product.name, product.sku, localStore);
      if (match) technicalContext = match.entry.specs;
    } catch (e) {}

    let generatedDescription = product.seoDescription;
    
    // If we have technical context, use it as the description base
    if (technicalContext) {
       generatedDescription = technicalContext;
    }

    product.seoDescription = generatedDescription;
    product.isIqSynced = true; // Mark as synced
    saveMockData(); // Persist to JSON
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    
    return { success: true, message: "Opis został zaimportowany z Bazy Wiedzy IQ", data: generatedDescription };
  } catch (e) {
    return { success: false, error: "Błąd generatora AI" };
  }
}

/**
 * Ręczne parowanie produktu z Inteligencją IQ Hub
 */
export async function syncProductWithIqAction(productId: string): Promise<ActionState> {
  try {
    const store = await getKnowledge();
    const { products } = initializeMockData();
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) return { success: false, error: "Nie znaleziono produktu" };

    const match = findBestKnowledgeMatch(product.name, product.sku, store);
    if (!match) return { success: false, error: "Brak wzorca technicznego w IQ Hub dla tego urządzenia" };

    // Update product with intelligence data
    product.catalogPrice = match.entry.price || 0;
    product.catalogSpecs = match.entry.specs || "";
    product.description = match.entry.specs || "";
    product.seoDescription = match.entry.specs || "";
    product.manufacturer = product.manufacturer || (match.entry.manufacturer || "");
    product.isIqSynced = true;

    saveMockData();
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");

    return { 
      success: true, 
      message: `Produkt zsynchronizowany z IQ Hub. Wykryto MSRP: ${product.catalogPrice} PLN.`,
      data: product 
    };
  } catch (e) {
    return { success: false, error: "Błąd podczas synchronizacji IQ" };
  }
}

/**
 * Promuje urządzenie wirtualne (z katalogu IQ) do fizycznej ewidencji
 */
export async function activateVirtualProductAction(sku: string): Promise<ActionState> {
  try {
    const store = await getKnowledge();
    const entry = store.knowledge[sku];
    if (!entry) return { success: false, error: "Nie znaleziono wzorca w Bazie Wiedzy" };

    const { products, categories: allCategories } = initializeMockData();
    
    // Attempt to map category and subcategory names to IDs
    let mappedCatId = null;
    let mappedSubId = null;

    if (entry.category) {
      const cat = allCategories.find((c: any) => c.name.toLowerCase().trim() === entry.category?.toLowerCase().trim());
      if (cat) {
        mappedCatId = cat.id;
        if (entry.subcategory) {
          const sub = cat.subcategories.find((s: any) => s.name.toLowerCase().trim() === entry.subcategory?.toLowerCase().trim());
          if (sub) mappedSubId = sub.id;
        }
      }
    }

    const newProduct = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sku: sku,
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

    products.push(newProduct);
    saveMockData();
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");

    return { success: true, message: `Urządzenie ${sku} zostało aktywowane w ewidencji.`, data: newProduct };
  } catch (e) {
    return { success: false, error: "Błąd podczas aktywacji urządzenia" };
  }
}

/**
 * Masowe dodawanie produktów bezpośrednio do ewidencji (Baza produktów)
 */
export async function bulkAddProductsToInventoryAction(items: any[]): Promise<ActionState> {
  try {
    const { products } = initializeMockData();
    let added = 0;

    items.forEach(item => {
      const sku = String(item.sku || '').trim().toLowerCase();
      const exists = products.find((p: any) => String(p.sku || '').trim().toLowerCase() === sku);
      
      if (!exists) {
        products.push({
          id: `p_direct_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...item,
          stock: item.stock || 0,
          price: item.price || 0,
          seoDescription: item.seoDescription || item.catalogSpecs || ""
        });
        added++;
      }
    });

    saveMockData();
    revalidatePath("/admin/products");
    return { success: true, message: `Dodano ${added} produktów bezpośrednio do bazy.` };
  } catch (e) {
    return { success: false, error: "Błąd podczas masowego zasilania bazy" };
  }
}

/**
 * Inteligentne zarządzanie strukturą (Kategorie / Producenci)
 * IMPLEMENTACJA: Usuwanie przenosi produkty na BIURKO (Safety First)
 */
export async function manageStructureAction(
  type: 'category' | 'subcategory' | 'manufacturer', 
  action: 'update' | 'delete', 
  id: string, 
  data?: any
): Promise<ActionState> {
  try {
    const { categories, manufacturers, products } = initializeMockData();
    
    // Logic for Manufacturers
    if (type === 'manufacturer') {
      const idx = manufacturers.findIndex((m: any) => m.id === id);
      if (idx === -1) return { success: false, error: "Nie znaleziono producenta" };

      if (action === 'delete') {
         const mName = manufacturers[idx].name;
         // SAFETY: Move products to staging (virtual) - in this mock implementation 
         // we just clear their manufacturer and mark for review by removing from products 
         // or setting a flag. User said "NA BIURKO".
         // In our architecture, items on "Biurko" are those in the catalogStore (Zustand).
         // Server-side we will just return them in the 'data' field so the client can add them to staging.
         const orphanedProducts = products.filter((p: any) => p.manufacturer === mName);
         
         // Remove orphaned from main DB
         orphanedProducts.forEach((p: any) => {
           const pIdx = products.findIndex((dp: any) => dp.id === p.id);
           if (pIdx !== -1) products.splice(pIdx, 1);
         });

         manufacturers.splice(idx, 1);
         saveMockData();
         revalidatePath("/admin/products");

         return { 
           success: true, 
           message: `Producent ${mName} usunięty. ${orphanedProducts.length} produktów trafiło na Biurko do ponownej klasyfikacji.`,
           data: orphanedProducts.map((p: any) => ({
             ...p,
             tempId: `orphaned_${p.id}`,
             qualityLevel: 'LOW',
             qualityReason: `Usunięto producenta: ${mName}`
           }))
         };
      }

      if (action === 'update' && data?.name) {
        const oldName = manufacturers[idx].name;
        manufacturers[idx].name = data.name;
        // Update all products with this manufacturer name
        products.forEach((p: any) => {
          if (p.manufacturer === oldName) p.manufacturer = data.name;
        });
        saveMockData();
        return { success: true, message: "Nazwa producenta zaktualizowana globalnie" };
      }
    }

    // Logic for Categories
    if (type === 'category') {
      const idx = categories.findIndex((c: any) => c.id === id);
      if (idx === -1) return { success: false, error: "Nie znaleziono kategorii" };

      if (action === 'delete') {
        const cName = categories[idx].name;
        const orphanedProducts = products.filter((p: any) => p.categoryId === id);
        
        orphanedProducts.forEach((p: any) => {
          const pIdx = products.findIndex((dp: any) => dp.id === p.id);
          if (pIdx !== -1) products.splice(pIdx, 1);
        });

        categories.splice(idx, 1);
        saveMockData();
        revalidatePath("/admin/products");

        return { 
          success: true, 
          message: `Kategoria ${cName} usunięta. ${orphanedProducts.length} produktów trafiło na Biurko.`,
          data: orphanedProducts.map((p: any) => ({
             ...p,
             tempId: `orphaned_${p.id}`,
             categoryId: null,
             subcategoryId: null,
             qualityLevel: 'LOW',
             qualityReason: `Usunięto kategorię: ${cName}`
          }))
        };
      }

      if (action === 'update' && data?.name) {
        categories[idx].name = data.name;
        saveMockData();
        return { success: true, message: "Kategoria zaktualizowana" };
      }
    }

    return { success: false, error: "Nieobsługiwany typ lub akcja" };
  } catch (e) {
    return { success: false, error: "Błąd podczas zarządzania strukturą" };
  }
}

/**
 * AUTONOMICZNY PROVISIONING (Neural Sieve V16.2)
 * Automatycznie tworzy brakujące byty i decyduje: Baza czy Biurko.
 */
export async function autonomousProvisioningAction(extractions: any[]): Promise<ActionState> {
  try {
    const { categories, manufacturers, products } = initializeMockData();
    let directCount = 0;
    let quarantined: any[] = [];

    extractions.forEach(entry => {
      // 1. NEURAL AUTO-EXPANSION (Bez pytania)
      
      // Auto-Category
      let finalCatId = null;
      let finalSubId = null;

      const getFuzzyMatch = (name: string, list: any[]) => {
        const n = (name || "").toLowerCase().trim();
        if (!n || n === "inne" || n === "nieznana") return null;
        return list.find(item => item.name.toLowerCase().trim() === n) || 
               list.find(item => item.name.toLowerCase().trim().includes(n)) ||
               list.find(item => n.includes(item.name.toLowerCase().trim()));
      };
      
      if (entry.category) {
        let cat = getFuzzyMatch(entry.category, categories);
        if (!cat) {
          cat = { 
            id: `c_auto_${Math.random().toString(36).substr(2, 5)}`, 
            name: entry.category.toUpperCase().trim(), 
            iconName: "Layers", 
            subcategories: [] 
          };
          categories.push(cat);
        }
        finalCatId = cat.id;

        // Auto-Subcategory
        if (entry.subcategory) {
          let sub = getFuzzyMatch(entry.subcategory, cat.subcategories);
          if (!sub) {
            sub = { id: `s_auto_${Math.random().toString(36).substr(2, 5)}`, name: entry.subcategory.trim() };
            cat.subcategories.push(sub);
          }
          finalSubId = sub.id;
        }
      }

      // Auto-Manufacturer
      if (entry.manufacturer && entry.manufacturer !== "BRAK" && entry.manufacturer !== "Brak") {
        let man = manufacturers.find((m: any) => m.name.toLowerCase().trim() === entry.manufacturer.toLowerCase().trim());
        if (!man) {
          manufacturers.push({ id: `m_auto_${Math.random().toString(36).substr(2, 5)}`, name: entry.manufacturer.trim() });
        }
      }

      // 2. QUALITY FUNNEL
      const quality = checkQuality(entry);
      
      if (quality.isClean) {
        // DIRECT COMMIT
        const sku = String(entry.model || '').trim();
        const exists = products.find((p: any) => p.sku === sku);
        
        if (!exists) {
          products.push({
            id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sku: sku,
            name: entry.model,
            manufacturer: entry.manufacturer,
            price: entry.price || 0,
            stock: 0,
            description: entry.specs || "Automatyczna specyfikacja techniczna w przygotowaniu.",
            catalogPrice: entry.price || 0,
            catalogSpecs: entry.specs || "",
            seoDescription: entry.specs || "",
            categoryId: finalCatId,
            subcategoryId: finalSubId,
            isIqSynced: true
          });
          directCount++;
        }
      } else {
        // QUARANTINE (Biurko)
        quarantined.push({
          ...entry,
          tempId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sku: entry.model || "BRAK SKU",
          name: entry.model || "NIEZNANY MODEL",
          qualityLevel: 'LOW',
          qualityReason: quality.reason,
          categoryId: finalCatId,
          subcategoryId: finalSubId
        });
      }
    });

    saveMockData();
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");

    return { 
      success: true, 
      message: `Neural Sieve zakończył operację. Autonomicznie dodano: ${directCount}. Produkty wymagające uwagi: ${quarantined.length}.`,
      data: quarantined 
    };
  } catch (e) {
    return { success: false, error: "Błąd podczas autonomicznego provisioningu" };
  }
}
