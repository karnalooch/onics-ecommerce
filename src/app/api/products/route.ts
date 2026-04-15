import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { products } = initializeMockData();
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { products } = initializeMockData();
  
  // Symulacja importu z WF-Maga
  if (body.action === 'IMPORT_WFMAG') {
    const importedItems = body.items || [];
    let updatedCount = 0;
    
    importedItems.forEach((im: any) => {
      const existing = products.find((p: any) => p.sku === im.sku);
      if (existing) {
        // WF-Mag nadpisuje tylko cenę i stany magazynowe! Ochrona SEO.
        existing.price = im.price;
        existing.stock = im.stock;
        updatedCount++;
      } else {
        // Nowy produkt
        products.push({
          id: `p${Date.now()}_${Math.random()}`,
          ...im,
          seoDescription: "" // Nowe produkty z WF-Mag nie mają jeszcze opisu SEO
        });
      }
    });
    
    return NextResponse.json({ success: true, updatedCount, addedCount: importedItems.length - updatedCount });
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
