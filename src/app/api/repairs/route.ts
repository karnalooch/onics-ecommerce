import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { repairs } = initializeMockData();
  return NextResponse.json(repairs);
}
