import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  
  const { orders } = initializeMockData();
  if (email) {
    return NextResponse.json(orders.filter((o: any) => o.user?.email === email));
  }
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { orders } = initializeMockData();
  const newOrder = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    status: body.orderType === 'INQUIRY' ? 'INQUIRY' : 'PENDING_VERIFICATION',
    estimatedDeliveryDays: null,
    totalPriceOrig: body.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0),
    totalPriceFinal: body.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0),
    ...body
  };
  orders.unshift(newOrder);
  return NextResponse.json(newOrder);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { orders } = initializeMockData();
  const idx = orders.findIndex((o: any) => o.id === body.id);
  
  if (idx !== -1) {
    // Oblicz nową cenę końcową na wypadek zmiany cen per element
    const items = body.items || orders[idx].items;
    const newTotal = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
    
    orders[idx] = { 
      ...orders[idx], 
      ...body, 
      totalPriceFinal: newTotal,
      updatedAt: new Date().toISOString() 
    };
    return NextResponse.json(orders[idx]);
  }
  return NextResponse.json({error: "Not Found"}, {status: 404});
}
