"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderTree, Folder, Plus, Trash2, Edit2, ChevronRight } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<any | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [newSubcatName, setNewSubcatName] = useState("");

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      setCategories(data);
      if (activeCat) {
        const refreshedActive = data.find((c: any) => c.id === activeCat.id);
        setActiveCat(refreshedActive || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.toUpperCase() })
    });
    setNewCatName("");
    loadCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Ostrzeżenie: Usunięcie Głównej Kategorii usunie również dostęp do przypisanych produktów. Kontynuować?")) return;
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    if (activeCat?.id === id) setActiveCat(null);
    loadCategories();
  };

  const handleAddSubcategory = async () => {
    if (!activeCat || !newSubcatName.trim()) return;
    const updatedSubcategories = [...activeCat.subcategories, newSubcatName];
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeCat.id, subcategories: updatedSubcategories })
    });
    setNewSubcatName("");
    loadCategories();
  };

  const handleDeleteSubcategory = async (sub: string) => {
    if (!activeCat) return;
    if (!confirm(`Zaraz usuniesz podkategorię: ${sub}. Jesteś pewien?`)) return;
    const updatedSubcategories = activeCat.subcategories.filter((s: string) => s !== sub);
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeCat.id, subcategories: updatedSubcategories })
    });
    loadCategories();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FolderTree className="h-8 w-8 text-primary" /> Struktura Kategorii
        </h2>
        <p className="text-muted-foreground">
          Rzeźb drzewo kategorii dla całego systemu. Zmiany odzwierciedlą się natychmiast w sklepach B2B i Detal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Lewa kolumna: Kategorie Główne */}
        <div className="col-span-1 md:col-span-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg">Kategorie Główne (Rodzice)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Synchronizacja struktury...</div>
                ) : (
                  categories.map(cat => (
                    <div 
                      key={cat.id} 
                      onClick={() => setActiveCat(cat)}
                      className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${
                        activeCat?.id === cat.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 font-semibold text-sm">
                        <Folder className={`w-4 h-4 ${activeCat?.id === cat.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        {cat.name}
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${activeCat?.id === cat.id ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-50'}`} />
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t bg-muted/10">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Nowa kat. np. OŚWIETLENIE LED" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button onClick={handleAddCategory} size="sm" className="px-3" disabled={!newCatName.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prawa kolumna: Podkategorie i Edycja Akt */}
        <div className="col-span-1 md:col-span-8">
          {activeCat ? (
            <div className="space-y-6">
              <Card className="shadow-sm border-blue-100">
                <CardHeader className="bg-blue-50/50 border-b flex flex-row items-start justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-blue-600" /> Detale Kategorii: <span className="text-blue-700">{activeCat.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Zarządzaj podgrupami (dziećmi) dla działu {activeCat.name}.
                    </CardDescription>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(activeCat.id)} className="h-8">
                    <Trash2 className="w-4 h-4 mr-2" /> Usuń Główny Dział
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Gałęzie Podrzędne (Subkategorie)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                    {activeCat.subcategories.length === 0 && (
                      <div className="col-span-full text-sm text-muted-foreground p-6 border border-dashed rounded-lg text-center bg-gray-50 uppercase">
                        Brak podkategorii w tym dziale.
                      </div>
                    )}
                    {activeCat.subcategories.map((sub: string, idx: number) => (
                      <div key={idx} className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:border-blue-300 hover:shadow-sm transition-all">
                         <span className="font-medium text-sm truncate pr-2">{sub}</span>
                         <button 
                           onClick={() => handleDeleteSubcategory(sub)}
                           className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all p-1"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 items-center max-w-sm pt-4 border-t">
                    <input 
                      type="text" 
                      value={newSubcatName}
                      onChange={e => setNewSubcatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSubcategory()}
                      placeholder="Nazwa nowej podkategorii..." 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <Button onClick={handleAddSubcategory} className="gap-2 h-10" disabled={!newSubcatName.trim()}>
                      <Plus className="w-4 h-4" /> Dodaj Gałąź
                    </Button>
                  </div>

                </CardContent>
              </Card>

              <Card className="shadow-sm bg-muted/20 border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground flex flex-col gap-2">
                  <p><strong>Porada systemowa:</strong> Usunięcie podkategorii spowoduje, że produkty do niej przypisane zostaną zrzutowane domyślnie na kategorię główną (Rodzica).</p>
                  <p>Tworząc asortyment w Bazie Produktów, opierasz go właśnie na ułożonej tutaj strukturze drzewiastej.</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full border border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10">
              <FolderTree className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">Brak wybranego wydziału</h3>
              <p className="max-w-md">Kliknij jedną z kategorii głównych po lewej stronie, aby otworzyć panel zarządzania szczegółowego i dodawać jej gałęzie (subkategorie).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
