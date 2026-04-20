// src/app/admin/products/_lib/types.ts

export interface ICategory {
  id: string;
  name: string;
  subcategories: ISubcategory[];
}

export interface ISubcategory {
  id: string;
  name: string;
}

export interface IManufacturer {
  id: string;
  name: string;
}

export interface IProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  manufacturer: string;
  categoryId: string | null;
  subcategoryId: string | null;
  imageUrl?: string;
  seoDescription?: string;
  specs?: string;
  isVirtual?: boolean;
  isIqSynced?: boolean;
}

export interface IStagingItem {
  tempId: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  manufacturer: string;
  categoryId: string | null;
  subcategoryId: string | null;
  xlsCategoryName: string;
  xlsSubcategoryName: string;
  isNewCategory: boolean;
  isNewSubcategory: boolean;
  qualityLevel: 'HIGH' | 'LOW';
  qualityReason: string;
  knowledgeMatched: boolean;
  specs: string;
  isValid: boolean;
}
