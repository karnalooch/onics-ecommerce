import { z } from "zod"

export const CatalogProductInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1),
  name: z.string().trim().min(2),
  price: z.coerce.number().min(0).nullable().optional(),
  stock: z.coerce.number().min(0).optional(),
  manufacturer: z.string().trim().optional(),
  categoryId: z.string().trim().nullable().optional(),
  subcategoryId: z.string().trim().nullable().optional(),
  seoDescription: z.string().max(5000).optional(),
})

export const CatalogProductUpdateSchema = CatalogProductInputSchema.extend({
  id: z.string().min(1),
})
