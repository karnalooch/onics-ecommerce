import { NextResponse } from 'next/server';
import { initializeMockData, saveMockData } from '@/store/serverStore';
import { authorizeAPI } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const { users } = initializeMockData();
  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const body = await req.json();
  const { users } = initializeMockData();
  
  const idx = users.findIndex((u: any) => u.id === body.id);
  
  if (idx !== -1) {
    const { passwordHash: _ignoredPasswordHash, ...safeBody } = body;
    users[idx] = { ...users[idx], ...safeBody, updatedAt: new Date().toISOString() };
    if (!saveMockData()) {
      return NextResponse.json({ error: "Nie udało się zapisać użytkownika." }, { status: 500 });
    }
    return NextResponse.json(users[idx]);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { users } = initializeMockData();
  
  const idx = users.findIndex((u: any) => u.id === id);
  if (idx !== -1) {
    users.splice(idx, 1);
    if (!saveMockData()) {
      return NextResponse.json({ error: "Nie udało się zapisać zmian." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}
