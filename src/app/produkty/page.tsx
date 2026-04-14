import { AddToCartButton } from "@/components/ui/AddToCartButton";

// Incremental Static Regeneration dla B2C masowego katalogu klienckiego
export const revalidate = 3600; // Rewalidacja danych co każdą godzinę

export default async function ConsumerCatalogPage() {
  // W normalnym przypadku byłoby to zapytanie do Strapi: fetch('http://127.0.0.1:1337/api/products?populate=*', { next: { revalidate: 3600 }})
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Katalog Produktów (B2C)</h1>
      <p className="text-muted-foreground mb-8">Błyskawicznie ładowane strony z użyciem funkcji Incremental Static Regeneration.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const price = 1500 - i * 12;
          const name = `Procesor Unit V${i} Standard`;
          const sku = `UNIT-V${i}`;

          return (
            <div key={i} className="border p-4 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-muted w-full h-40 rounded-md mb-4 flex items-center justify-center text-muted-foreground">
                [Zdjęcie {i}]
              </div>
              <h3 className="font-medium text-lg leading-tight mb-2">{name}</h3>
              <p className="text-xl font-bold text-primary mb-4">{price.toFixed(2)} PLN <span className="text-sm font-normal text-muted-foreground">Brutto</span></p>
              <AddToCartButton product={{ id: String(i), sku, name, price, quantity: 1 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
