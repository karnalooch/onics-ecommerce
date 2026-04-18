import { NextResponse } from 'next/server';
import { getKnowledge, saveKnowledge } from '@/lib/knowledge/parser';
import { authorizeAPI } from '@/lib/authUtils';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const authCheck = await authorizeAPI(["ADMIN"]);
    if (!authCheck.authorized) return authCheck.response;

    const { model } = await params;
    const decodedModel = decodeURIComponent(model).toUpperCase();
    const store = await getKnowledge();
    
    if (store.knowledge[decodedModel]) {
      delete store.knowledge[decodedModel];
      await saveKnowledge(store);
      return NextResponse.json({ success: true, message: `Model ${decodedModel} został usunięty z bazy.` });
    } else {
      return NextResponse.json({ error: "Nie znaleziono modelu w bazie." }, { status: 404 });
    }
  } catch (err) {
    console.error("DELETE Snippet Error:", err);
    return NextResponse.json({ error: "Błąd serwera podczas usuwania." }, { status: 500 });
  }
}
