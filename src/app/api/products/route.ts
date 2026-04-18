import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { initializeMockData } from '@/store/serverStore';
import { authorizeAPI } from '@/lib/authUtils';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function logImport(msg: string) {
  try {
    const logPath = path.join(process.cwd(), 'import_debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
  } catch (e) {}
}

export async function GET() {
  const session = await auth();
  const { products } = initializeMockData();
  
  // Sprawdź rolę użytkownika
  const role = (session?.user as any)?.role;
  const isAuthorized = role === "ADMIN" || role === "BIZ";

  if (!isAuthorized) {
    // Ukrywamy ceny przed detalistami i gośćmi
    const safeProducts = products.map((p: any) => ({
      ...p,
      price: null, // Klient musi się zalogować
      priceHidden: true
    }));
    return NextResponse.json(safeProducts);
  }

  // Dla B2B/Admin zwracamy pełne dane z flagą widoczności
  const fullProducts = products.map((p: any) => ({
    ...p,
    priceHidden: false
  }));

  return NextResponse.json(fullProducts);
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const body = await req.json();
  const { products } = initializeMockData();
  
  // Symulacja importu z WF-Maga
  if (body.action === 'IMPORT_WFMAG') {
    const importedItems = body.items || [];
    const { categories } = initializeMockData();
    let updatedCount = 0;
    let addedCount = 0;
    
    logImport(`--- START IMPORT (${importedItems.length} pozycji) ---`);

    importedItems.forEach((im: any, index: number) => {
      const imSku = String(im.sku || '').trim().toLowerCase();
      
      if (index === 0) {
        logImport(`Wykryte pola w pierwszym produkcie: ${Object.keys(im).join(', ')}`);
      }

      if (!imSku) {
        logImport(`Pominięto pozycję bez SKU (Wirtualne SKU nie dotarło?)`);
        return;
      }
      
      let existing = products.find((p: any) => 
        String(p.sku || '').trim().toLowerCase() === imSku
      );

      if (!existing && im.name) {
        const imNameMatch = String(im.name).trim().toLowerCase();
        existing = products.find((p: any) => p.name.trim().toLowerCase() === imNameMatch);
        if (existing) logImport(`Dopasowano po NAZWIE: "${im.name}"`);
      }

      logImport(`Przetwarzanie SKU: "${im.sku}" -> Dopasowano: ${existing ? 'TAK (' + existing.id + ')' : 'NIE'}`);
      
      // Obsługa propozycji kategoryzacji
      let finalCategoryId = im.categoryId;
      let finalSubcategoryId = im.subcategoryId;

      // 1. Jeśli to nowa kategoria (PROPOZYCJA)
      if (im.isNewCategory && im.xlsCategoryName) {
        let cat = categories.find((c: any) => c.name.toLowerCase().trim() === im.xlsCategoryName.toLowerCase().trim());
        if (!cat) {
          cat = { 
            id: `c_auto_${Math.random().toString(36).substr(2, 5)}`, 
            name: im.xlsCategoryName.toUpperCase().trim(), 
            iconName: "Layers", 
            subcategories: [] 
          };
          categories.push(cat);
          logImport(`Utworzono nową kategorię: ${cat.name}`);
        }
        finalCategoryId = cat.id;
      }

      // 2. Jeśli to nowa podkategoria (PROPOZYCJA)
      if (im.isNewSubcategory && im.xlsSubcategoryName && finalCategoryId) {
        let cat = categories.find((c: any) => c.id === finalCategoryId);
        if (cat) {
          let sub = cat.subcategories.find((s: any) => s.name.toLowerCase().trim() === im.xlsSubcategoryName.toLowerCase().trim());
          if (!sub) {
            sub = {
              id: `s_auto_${Math.random().toString(36).substr(2, 5)}`,
              name: im.xlsSubcategoryName.trim()
            };
            cat.subcategories.push(sub);
            logImport(`Dodano nową podkategorię "${sub.name}" do kategorii ${cat.name}`);
          }
          finalSubcategoryId = sub.id;
        }
      }

      if (existing) {
        existing.price = im.price;
        existing.stock = im.stock;
        existing.manufacturer = im.manufacturer || existing.manufacturer;

        if (finalCategoryId) {
          existing.categoryId = finalCategoryId;
          existing.subcategoryId = finalSubcategoryId;
          logImport(`Zaktualizowano kategoryzację dla ${im.sku}: ${finalCategoryId} / ${finalSubcategoryId}`);
        }
        
        updatedCount++;
      } else {
        const newProd = {
          id: `p${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...im,
          categoryId: finalCategoryId,
          subcategoryId: finalSubcategoryId,
          seoDescription: "" 
        };
        products.push(newProd);
        addedCount++;
        logImport(`Dodano NOWY produkt (${newProd.sku}): ${im.name}`);
      }
    });

    logImport(`--- KONIEC IMPORTU (Zaktualizowano: ${updatedCount}, Dodano: ${addedCount}, Suma w bazie: ${products.length}) ---`);
    return NextResponse.json({ success: true, updatedCount, addedCount });
  }

  // Zwykłe dodanie pojedynczego produktu
  const newProduct = {
    id: `p${Date.now()}`,
    ...body
  };
  products.push(newProduct);
  return NextResponse.json(newProduct);
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const body = await req.json();
  const { products } = initializeMockData();
  
  const idx = products.findIndex((p: any) => p.id === body.id);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...body };
    return NextResponse.json(products[idx]);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { products } = initializeMockData();
  
  const idx = products.findIndex((p: any) => p.id === id);
  if (idx !== -1) {
    products.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}
