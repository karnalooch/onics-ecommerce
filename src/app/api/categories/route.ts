import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';
import { authorizeAPI } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { categories } = initializeMockData();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const body = await req.json();
  const { categories } = initializeMockData();
  const newCat = {
    id: `c${Date.now()}`,
    name: body.name,
    iconName: body.iconName || "Folder",
    subcategories: body.subcategories || []
  };
  categories.push(newCat);
  return NextResponse.json(newCat);
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const body = await req.json();
  const { categories } = initializeMockData();
  
  const idx = categories.findIndex((c: any) => c.id === body.id);
  if (idx !== -1) {
    // Sanitizacja podkategorii - upewniamy się, że zawsze są obiektami z ID
    if (body.subcategories && Array.isArray(body.subcategories)) {
        body.subcategories = body.subcategories.map((sub: any) => {
            if (typeof sub === 'string') {
                return {
                    id: `s${Math.random().toString(36).substr(2, 9)}`,
                    name: sub.trim()
                };
            }
            return {
                id: sub.id || `s${Math.random().toString(36).substr(2, 9)}`,
                name: sub.name?.trim() || "Bez nazwy"
            };
        });
    }

    // Aktualizacja w miejscu (reference update)
    const updatedCategory = { ...categories[idx], ...body };
    categories[idx] = updatedCategory;
    
    console.log(`[API] Zaktualizowano kategorię ${body.id}. Liczba subkategorii: ${updatedCategory.subcategories?.length}`);
    return NextResponse.json(updatedCategory);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { categories } = initializeMockData();
  
  const idx = categories.findIndex((c: any) => c.id === id);
  if (idx !== -1) {
    categories.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}
