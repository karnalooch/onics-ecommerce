// src/app/admin/products/_lib/inventoryLogic.ts
import { ICategory, IProduct, IStagingItem, IManufacturer } from "./types";

export function processInventoryData(
  rawData: any[], 
  initialProducts: IProduct[],
  localCategories: ICategory[],
  localManufacturers: IManufacturer[]
): { staging: IStagingItem[], pendingStructure: any } {
  
  const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const normalize = (s: any) => String(s || "").replace(/\u00A0/g, " ").trim();
  const junkWords = ['NIEZNANY', 'INNE', 'NIESKLASYFIKOWANE', 'POZOSTAŁE', 'MISC', 'BRAK', 'PRODUKT', 'ARTYKUŁ', 'NIEZNANA'];
  const isJunk = (str: string) => junkWords.includes(normalize(str).toUpperCase());

  let lastKnownCat = "";
  let lastKnownSub = "";
  let lastKnownMnt = "";

  const staging: IStagingItem[] = rawData.map((row, idx) => {
    const rowKeys = Object.keys(row);
    const findVal = (keys: string[], fallbackIndex?: number) => {
      const targetKeys = keys.map(k => cleanKey(k));
      const foundKey = rowKeys.find(k => targetKeys.some(tk => cleanKey(k).includes(tk)));
      if (foundKey) return row[foundKey];
      if (fallbackIndex !== undefined && fallbackIndex < rowKeys.length) return row[rowKeys[fallbackIndex]];
      return undefined;
    };

    let inputCat = normalize(row.xlsCategoryName || findVal(["KATEGORIA"], 5));
    let inputSub = normalize(row.xlsSubcategoryName || findVal(["PODKATEGORIA"], 6));
    let mntName = normalize(row.manufacturer || findVal(["PRODUCENT"], 4));
    let skuVal = normalize(row.sku || findVal(["Symbol", "Kod", "SKU"], 2));
    let nameVal = normalize(row.name || findVal(["Nazwa", "Produkt"], 3));

    const existingInCrt = initialProducts.find(p => p.sku === skuVal);
    const knowledgeMatched = !!existingInCrt;

    if (inputCat && !isJunk(inputCat)) lastKnownCat = inputCat;
    else if (!inputCat && lastKnownCat) inputCat = lastKnownCat;

    if (inputSub && !isJunk(inputSub)) lastKnownSub = inputSub;
    else if (!inputSub && lastKnownSub) inputSub = lastKnownSub;

    if (mntName && !isJunk(mntName)) lastKnownMnt = mntName;
    else if (!mntName && lastKnownMnt) mntName = lastKnownMnt;

    let catId = existingInCrt?.categoryId || null;
    let subId = existingInCrt?.subcategoryId || null;
    if (knowledgeMatched && !mntName) mntName = existingInCrt.manufacturer;

    let statusReason = knowledgeMatched ? "Baza CRT: Znaleziono rekord" : "Nowy produkt";
    let qLevel: 'HIGH' | 'LOW' = knowledgeMatched ? 'HIGH' : 'LOW';

    if (!catId && inputCat && !isJunk(inputCat)) {
       const cat = localCategories.find(c => {
         const cn = normalize(c.name).toLowerCase();
         const inc = inputCat.toLowerCase();
         return cn === inc || inc.includes(cn) || cn.includes(inc);
       });

       if (cat) {
          catId = cat.id;
          statusReason = knowledgeMatched ? `CRT Sync: ${cat.name}` : `Zmapowano: ${cat.name}`;
          qLevel = 'HIGH';
          if (!subId && inputSub && !isJunk(inputSub)) {
             const sub = cat.subcategories.find((s: any) => {
                const sn = normalize(s.name).toLowerCase();
                const ins = inputSub.toLowerCase();
                return sn === ins || ins.includes(sn) || sn.includes(ins);
             });
             if (sub) {
                subId = sub.id;
                statusReason += ` -> ${sub.name}`;
             }
          }
       }
    }

    return {
       tempId: `stg_${idx}_${Date.now()}`,
       sku: skuVal || `sku_${idx}`,
       name: nameVal || "Produkt bez nazwy",
       price: Number(row.price || 0),
       stock: Number(row.stock || 0),
       manufacturer: mntName,
       categoryId: catId,
       subcategoryId: subId,
       xlsCategoryName: inputCat,
       xlsSubcategoryName: inputSub,
       isNewCategory: !catId && !!inputCat && !isJunk(inputCat),
       isNewSubcategory: !!(catId && !subId && !!inputSub && !isJunk(inputSub)),
       qualityLevel: qLevel,
       qualityReason: statusReason,
       knowledgeMatched,
       specs: row.specs || existingInCrt?.specs || "",
       isValid: true
    };
  });

  const newCats = Array.from(new Set(staging.filter(i => i.isNewCategory).map(i => i.xlsCategoryName)));
  const newSubs = Array.from(new Set(staging.filter(i => i.isNewSubcategory).map(i => JSON.stringify({ parent: i.xlsCategoryName, name: i.xlsSubcategoryName })))).map(s => JSON.parse(s));
  const existingMansSet = new Set(localManufacturers.map(m => m.name.toLowerCase()));
  const newMans = Array.from(new Set(staging.filter(i => i.manufacturer && !isJunk(i.manufacturer) && !existingMansSet.has(i.manufacturer.toLowerCase())).map(i => i.manufacturer)));

  return {
    staging,
    pendingStructure: { categories: newCats, subcategories: newSubs, manufacturers: newMans }
  };
}
