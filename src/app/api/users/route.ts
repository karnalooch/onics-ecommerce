import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { users } = initializeMockData();
  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { users } = initializeMockData();
  
  const idx = users.findIndex((u: any) => u.id === body.id);
  
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...body, updatedAt: new Date().toISOString() };
    return NextResponse.json(users[idx]);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { users } = initializeMockData();
  
  const idx = users.findIndex((u: any) => u.id === id);
  if (idx !== -1) {
    users.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}
