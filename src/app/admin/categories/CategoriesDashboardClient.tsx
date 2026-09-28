"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  Cpu,
  Folder,
  Home,
  Mic,
  Network,
  Plus,
  Save,
  Shield,
  Smartphone,
  Speaker,
  Trash2,
  Tv,
  Video,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  addCategoryAction,
  addSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  renameSubcategoryAction,
  updateCategoryAction,
} from "./_actions"

type Subcategory = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  iconName?: string
  revision?: number
  subcategories?: Subcategory[]
}

const ICONS: Record<string, LucideIcon> = {
  Tv,
  Smartphone,
  Video,
  Network,
  Shield,
  Cpu,
  Zap,
  Activity,
  Wrench,
  Home,
  Speaker,
  Mic,
  Folder,
}

export function CategoriesDashboardClient({
  initialCategories,
}: {
  initialCategories: Category[]
}) {
  const router = useRouter()
  const [activeCatId, setActiveCatId] = useState<string | null>(
    initialCategories[0]?.id || null
  )
  const [newCatName, setNewCatName] = useState("")
  const [newSubcatName, setNewSubcatName] = useState("")
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renamingSubcategory, setRenamingSubcategory] = useState<string | null>(
    null
  )
  const [renameValue, setRenameValue] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (
      activeCatId &&
      !initialCategories.some((category) => category.id === activeCatId)
    ) {
      setActiveCatId(initialCategories[0]?.id || null)
    }
  }, [activeCatId, initialCategories])

  const activeCategory =
    initialCategories.find((category) => category.id === activeCatId) || null
  const ActiveIcon = activeCategory
    ? ICONS[activeCategory.iconName || "Folder"] || Folder
    : Folder

  const run = (
    operation: () => Promise<{ success: boolean; message?: string; error?: string }>,
    successFallback: string
  ) => {
    startTransition(async () => {
      const result = await operation()
      if (!result.success) {
        toast.error(result.error || "Operacja nie powiodła się.")
        return
      }
      toast.success(result.message || successFallback)
      router.refresh()
    })
  }

  const addCategory = () => {
    const name = newCatName.trim()
    if (!name) return

    startTransition(async () => {
      const result = await addCategoryAction(name)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      setNewCatName("")
      if (result.data?.id) setActiveCatId(String(result.data.id))
      toast.success(result.message || "Kategoria dodana.")
      router.refresh()
    })
  }

  const addSubcategory = () => {
    const name = newSubcatName.trim()
    if (!activeCategory || !name) return

    run(async () => {
      const result = await addSubcategoryAction(activeCategory.id, name)
      if (result.success) setNewSubcatName("")
      return result
    }, "Podkategoria dodana.")
  }

  const saveCategoryName = (category: Category) => {
    const name = renameValue.trim()
    if (!name) {
      setRenamingCategory(null)
      return
    }

    run(
      () => updateCategoryAction({ id: category.id, name }),
      "Nazwa kategorii zapisana."
    )
    setRenamingCategory(null)
  }

  const saveSubcategoryName = (subcategory: Subcategory) => {
    const name = renameValue.trim()
    if (!activeCategory || !name) {
      setRenamingSubcategory(null)
      return
    }

    run(
      () =>
        renameSubcategoryAction(activeCategory.id, subcategory.id, name),
      "Nazwa podkategorii zapisana."
    )
    setRenamingSubcategory(null)
  }

  const deleteCategory = (category: Category) => {
    if (
      !window.confirm(
        "Usunąć kategorię " +
          category.name +
          "? Operacja zostanie zablokowana, jeśli katalog nadal jej używa."
      )
    ) {
      return
    }

    const revision =
      Number.isSafeInteger(category.revision) && Number(category.revision) >= 0
        ? Number(category.revision)
        : 0

    run(
      () => deleteCategoryAction(category.id, revision),
      "Kategoria usunięta."
    )
  }

  const deleteSubcategory = (subcategory: Subcategory) => {
    if (
      !activeCategory ||
      !window.confirm(
        "Usunąć podkategorię " +
          subcategory.name +
          "? Operacja zostanie zablokowana, jeśli katalog nadal jej używa."
      )
    ) {
      return
    }

    run(
      () => deleteSubcategoryAction(activeCategory.id, subcategory.id),
      "Podkategoria usunięta."
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
            Taksonomia katalogu
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Struktura katalogu
          </h1>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Kategorie i podkategorie używane przez produkty, import i wyszukiwanie.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2 text-sm">
          Kategorie
          <strong className="ml-2 font-mono">{initialCategories.length}</strong>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
          <div className="border-b border-[var(--ops-border)] p-4">
            <div className="text-sm font-semibold">Kategorie</div>
            <div className="mt-3 flex gap-2">
              <input
                value={newCatName}
                onChange={(event) => setNewCatName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addCategory()
                }}
                placeholder="Nowa kategoria"
                className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--ops-border)] bg-transparent px-3 text-sm"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={isPending || !newCatName.trim()}
                className="h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
                aria-label="Dodaj kategorię"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--ops-border)]">
            {initialCategories.map((category) => {
              const Icon = ICONS[category.iconName || "Folder"] || Folder
              const active = category.id === activeCatId
              const renaming = renamingCategory === category.id

              return (
                <div
                  key={category.id}
                  className={
                    "grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 " +
                    (active ? "bg-slate-50 dark:bg-white/[0.04]" : "")
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveCatId(category.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--ops-muted)]" />
                    {renaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveCategoryName(category)
                          if (event.key === "Escape") {
                            setRenamingCategory(null)
                          }
                        }}
                        onBlur={() => saveCategoryName(category)}
                        className="h-9 min-w-0 flex-1 rounded-md border border-[var(--ops-border)] bg-[var(--ops-panel)] px-2 text-sm"
                      />
                    ) : (
                      <span className="truncate text-sm font-semibold">
                        {category.name}
                      </span>
                    )}
                  </button>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingCategory(category.id)
                        setRenameValue(category.name)
                      }}
                      className="min-h-9 rounded-md border border-[var(--ops-border)] px-2 text-xs"
                    >
                      Nazwa
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      className="min-h-9 rounded-md border border-red-200 px-2 text-red-700 dark:border-red-900 dark:text-red-300"
                      aria-label={"Usuń kategorię " + category.name}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <main className="min-w-0">
          {!activeCategory ? (
            <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-panel)] p-6 text-sm text-[var(--ops-muted)]">
              Wybierz kategorię.
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border)]">
                      <ActiveIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {activeCategory.name}
                      </h2>
                      <div className="mt-1 font-mono text-xs text-[var(--ops-muted)]">
                        {activeCategory.id}
                      </div>
                    </div>
                  </div>

                  <label className="text-sm">
                    <span className="mr-2 text-[var(--ops-muted)]">Ikona</span>
                    <select
                      value={activeCategory.iconName || "Folder"}
                      disabled={isPending}
                      onChange={(event) =>
                        run(
                          () =>
                            updateCategoryAction({
                              id: activeCategory.id,
                              iconName: event.target.value,
                            }),
                          "Ikona kategorii zapisana."
                        )
                      }
                      className="h-10 rounded-lg border border-[var(--ops-border)] bg-transparent px-3"
                    >
                      {Object.keys(ICONS).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
                <div className="flex flex-col justify-between gap-3 border-b border-[var(--ops-border)] p-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-semibold">Podkategorie</h3>
                    <p className="mt-1 text-xs text-[var(--ops-muted)]">
                      {activeCategory.subcategories?.length || 0} pozycji
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newSubcatName}
                      onChange={(event) => setNewSubcatName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addSubcategory()
                      }}
                      placeholder="Nowa podkategoria"
                      className="h-10 min-w-0 rounded-lg border border-[var(--ops-border)] bg-transparent px-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addSubcategory}
                      disabled={isPending || !newSubcatName.trim()}
                      className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
                    >
                      Dodaj
                    </button>
                  </div>
                </div>

                {!activeCategory.subcategories?.length ? (
                  <div className="p-6 text-sm text-[var(--ops-muted)]">
                    Brak podkategorii.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--ops-border)]">
                    {activeCategory.subcategories.map((subcategory) => {
                      const renaming =
                        renamingSubcategory === subcategory.id

                      return (
                        <div
                          key={subcategory.id}
                          className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2"
                        >
                          {renaming ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(event) =>
                                setRenameValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  saveSubcategoryName(subcategory)
                                }
                                if (event.key === "Escape") {
                                  setRenamingSubcategory(null)
                                }
                              }}
                              onBlur={() =>
                                saveSubcategoryName(subcategory)
                              }
                              className="h-9 min-w-0 rounded-md border border-[var(--ops-border)] bg-transparent px-2 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {subcategory.name}
                            </span>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingSubcategory(subcategory.id)
                                setRenameValue(subcategory.name)
                              }}
                              className="min-h-9 rounded-md border border-[var(--ops-border)] px-3 text-xs font-semibold"
                            >
                              Zmień nazwę
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSubcategory(subcategory)}
                              className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
                            >
                              Usuń
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {isPending ? (
        <div className="text-xs text-[var(--ops-muted)]" aria-live="polite">
          Zapisywanie zmian…
        </div>
      ) : null}
    </div>
  )
}
