// src/app/admin/repairs/_components/RmaAddForm.tsx
"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Wrench } from "lucide-react";
import { addRepairAction } from "../_actions";
import { toast } from "sonner";

export function RmaAddForm({ onCancel }: { onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addRepairAction(formData);
      if (result.success) {
        toast.success(result.message);
        onCancel();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="lg:col-span-12 animate-in slide-in-from-top-4 duration-500">
      <Card className="border-primary/20 bg-primary/5 shadow-2xl rounded-[3rem] overflow-hidden">
         <div className="bg-primary p-8 text-primary-foreground flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight">Nowy Protokół Usterki</h3>
              <p className="text-primary-foreground/70 font-bold text-sm">Ręczne wprowadzanie danych urządzenia do systemu RMA.</p>
            </div>
            <Wrench className="w-10 h-10 opacity-20" />
         </div>
         <CardContent className="p-10">
           <form action={handleSubmit}>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                <FormInput label="Nazwa Klienta" name="client" placeholder="np. Sklep El-Mont" required />
                <FormInput label="Urządzenie / Model" name="item" placeholder="np. BCS-L-DVR04" required />
                <FormInput label="S/N - Numer Seryjny" name="serial" placeholder="SN..." />
             </div>
             <div className="mt-10 flex justify-end gap-4 border-t border-primary/10 pt-8">
                <Button variant="ghost" type="button" className="rounded-2xl font-black uppercase text-xs" onClick={onCancel}>Anuluj</Button>
                <Button type="submit" disabled={isPending} className="rounded-2xl px-10 h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30">
                   {isPending ? "Przetwarzanie..." : <><Save className="w-5 h-5 mr-3" /> Utwórz Zgłoszenie</>}
                </Button>
             </div>
           </form>
         </CardContent>
      </Card>
    </div>
  );
}

function FormInput({ label, name, placeholder, required }: { label: string, name: string, placeholder: string, required?: boolean }) {
  return (
    <div className="space-y-4 text-left">
       <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">{label}</label>
       <input 
         name={name}
         required={required}
         autoComplete="off"
         className="w-full h-14 bg-white rounded-2xl border border-slate-200 px-5 font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
         placeholder={placeholder}
       />
    </div>
  );
}
