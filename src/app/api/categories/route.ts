import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { categories } = initializeMockData();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { categories } = initializeMockData();
  const newCat = {
    id: `c${Date.now()}`,
    name: body.name,
    subcategories: body.subcategories || []
  };
  categories.push(newCat);
  return NextResponse.json(newCat);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { categories } = initializeMockData();
  
  const idx = categories.findIndex((c: any) => c.id === body.id);
  if (idx !== -1) {
    categories[idx] = { ...categories[idx], ...body };
    return NextResponse.json(categories[idx]);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}

export async function DELETE(req: Request) {
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
