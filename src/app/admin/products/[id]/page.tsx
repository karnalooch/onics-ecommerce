import { auth } from "@/auth";
import { authorizeAPI } from "@/lib/authUtils";
import { hasAccountRoleAccess } from "@/lib/accountAccess";
import { findStoredUserBySession } from "@/lib/sessionIdentity";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { initializeMockData, mutateMockData } from "@/store/serverStore";
import {
  assertCatalogClassification,
  catalogProductRevision,
  hasSkuConflict,
  isCatalogProductUpdateReplay,
  nextCatalogProductRevision,
} from "@/lib/catalog";
import {
  shouldDeferProductStockWrite,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations";

type StoredActor = {
  id?: string;
  email?: string;
  roleType?: string;
  isApproved?: boolean;
  isBlocked?: boolean;
};

function assertCurrentAdminActionAccess(
  users: StoredActor[],
  actor: { id?: string; email?: string | null }
) {
  const currentActor = findStoredUserBySession(users, actor);
  if (
    !currentActor ||
    !hasAccountRoleAccess(currentActor, ["ADMIN"])
  ) {
    throw new Error(
      "Uprawnienia administratora zmieniły się przed zapisem produktu."
    );
  }
}

const ProductFormSchema = z.object({
  name: z.string().trim().min(2).max(240),
  sku: z.string().trim().min(1).max(120),
  price: z.coerce.number().finite().min(0).max(100_000_000),
  stock: z.coerce.number().int().min(0).max(100_000_000),
  manufacturer: z.string().trim().max(160).optional().default(""),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  description: z.string().max(10_000).optional().default(""),
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
});

export default async function EditProductPage({ params }: { params: any }) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/logowanie");
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { products, categories, manufacturers } = initializeMockData();

  let product: any = null;
  if (id !== "new") {
    product = products.find((candidate: any) => String(candidate.id) === id);
    if (!product) {
      return (
        <div className="p-20 text-center">
          Nie znaleziono produktu o ID: {id}
        </div>
      );
    }
  }

  async function saveProduct(formData: FormData) {
    "use server";

    const authCheck = await authorizeAPI(["ADMIN"]);
    if (!authCheck.authorized) {
      throw new Error("Brak uprawnień administratora.");
    }

    const parsed = ProductFormSchema.safeParse({
      name: formData.get("name"),
      sku: formData.get("sku"),
      price: formData.get("price"),
      stock: formData.get("stock"),
      manufacturer: formData.get("manufacturer"),
      categoryId: String(formData.get("categoryId") || "").trim() || null,
      subcategoryId: String(formData.get("subcategoryId") || "").trim() || null,
      description: formData.get("description"),
      expectedRevision: formData.get("expectedRevision") || undefined,
    });

    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || "Nieprawidłowe dane produktu."
      );
    }

    await mutateMockData((db) => {
      assertCurrentAdminActionAccess(
        db.users as StoredActor[],
        authCheck.user
      );
      const productStore = db.products as any[];
      const categoryStore = db.categories as any[];
      const { expectedRevision, ...input } = parsed.data;

      assertCatalogClassification(
        categoryStore,
        input.categoryId,
        input.subcategoryId
      );

      if (id === "new") {
        if (hasSkuConflict(productStore, input.sku)) {
          throw new Error("SKU_EXISTS");
        }

        productStore.push({
          id: `p_${crypto.randomUUID()}`,
          ...input,
          seoDescription: input.description,
          revision: 0,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (expectedRevision === undefined) {
        throw new Error("PRODUCT_REVISION_REQUIRED");
      }

      const index = productStore.findIndex(
        (candidate) => String(candidate.id) === id
      );
      if (index === -1) throw new Error("PRODUCT_NOT_FOUND");

      const current = productStore[index];
      const currentRevision = catalogProductRevision(current.revision);
      const updateData = {
        ...input,
        seoDescription: input.description || current.seoDescription || "",
      };

      if (expectedRevision !== currentRevision) {
        if (isCatalogProductUpdateReplay(current, updateData)) return;
        throw new Error("PRODUCT_REVISION_CONFLICT");
      }

      if (isCatalogProductUpdateReplay(current, updateData)) return;

      if (hasSkuConflict(productStore, input.sku, id)) {
        throw new Error("SKU_EXISTS");
      }
      if (
        shouldDeferProductStockWrite(
          db.orders as InventoryReservationOrder[],
          id,
          current.stock,
          input.stock
        )
      ) {
        throw new Error("PRODUCT_STOCK_RESERVED");
      }

      productStore[index] = {
        ...current,
        ...input,
        seoDescription: updateData.seoDescription,
        revision: nextCatalogProductRevision(currentRevision),
        updatedAt: new Date().toISOString(),
      };
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    revalidatePath("/sklep");
    redirect("/admin/products");
  }

  const selectedCategoryId = product?.categoryId || "";
  const selectedSubcategoryId = product?.subcategoryId || "";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header className="border-b border-[var(--ops-border)] pb-6">
        <Link
          href="/admin/products"
          className="text-sm font-semibold text-[var(--ops-muted)] hover:text-foreground"
        >
          ← Wróć do katalogu
        </Link>
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
          Katalog techniczny
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {product ? "Edycja produktu" : "Nowy produkt"}
        </h1>
        {product ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ops-muted)]">
            <span className="font-mono">{String(product.sku || "")}</span>
            <span>{String(product.name || "")}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Dodaj nowy indeks do katalogu.
          </p>
        )}
      </header>

      <form
        action={saveProduct}
        className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]"
      >
        {product ? (
          <input
            type="hidden"
            name="expectedRevision"
            value={catalogProductRevision(product.revision)}
          />
        ) : null}

        <section className="border-b border-[var(--ops-border)] p-5">
          <h2 className="text-sm font-semibold">Identyfikacja</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Nazwa produktu
              </span>
              <input
                type="text"
                name="name"
                defaultValue={product?.name || ""}
                required
                minLength={2}
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                SKU / indeks
              </span>
              <input
                type="text"
                name="sku"
                defaultValue={product?.sku || ""}
                required
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 font-mono"
              />
            </label>
          </div>
        </section>

        <section className="border-b border-[var(--ops-border)] p-5">
          <h2 className="text-sm font-semibold">Cena i magazyn</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Cena netto (PLN)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                defaultValue={product?.price ?? 0}
                required
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 font-mono"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Stan magazynowy
              </span>
              <input
                type="number"
                min="0"
                name="stock"
                defaultValue={product?.stock ?? 0}
                required
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 font-mono"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Producent
              </span>
              <select
                name="manufacturer"
                defaultValue={product?.manufacturer || ""}
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3"
              >
                <option value="">Brak producenta</option>
                {manufacturers.map((manufacturer: any) => (
                  <option key={manufacturer.id} value={manufacturer.name}>
                    {manufacturer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="border-b border-[var(--ops-border)] p-5">
          <h2 className="text-sm font-semibold">Klasyfikacja</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Kategoria
              </span>
              <select
                name="categoryId"
                defaultValue={selectedCategoryId}
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3"
              >
                <option value="">Brak kategorii</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Podkategoria
              </span>
              <select
                name="subcategoryId"
                defaultValue={selectedSubcategoryId}
                className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3"
              >
                <option value="">Brak podkategorii</option>
                {categories.flatMap((category: any) =>
                  (category.subcategories || []).map((subcategory: any) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {category.name} — {subcategory.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </section>

        <section className="p-5">
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Opis techniczny
            </span>
            <textarea
              name="description"
              defaultValue={
                product?.description || product?.seoDescription || ""
              }
              rows={12}
              className="w-full rounded-lg border border-[var(--ops-border)] bg-transparent p-3 font-mono text-sm leading-6"
            />
          </label>
        </section>

        <footer className="flex justify-end border-t border-[var(--ops-border)] p-4">
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            Zapisz produkt
          </button>
        </footer>
      </form>
    </div>
  )
}
