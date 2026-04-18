// src/app/admin/products/_components/WfMagUploadButton.tsx
"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface IWfMagUploadButtonProps {
  onParsed: (data: any[]) => void;
  disabled?: boolean;
}

export function WfMagUploadButton({ onParsed, disabled }: IWfMagUploadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        onParsed(data);
        toast.success(`Wczytano ${data.length} pozycji do bufora.`);
      } catch (err) {
        toast.error("Błąd podczas odczytu pliku Excel.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  return (
    <div className="relative">
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        onChange={handleFile}
        className="hidden" 
        id="wfmag-upload-input"
        disabled={disabled || loading}
      />
      <label htmlFor="wfmag-upload-input">
        <Button 
          asChild
          disabled={disabled || loading}
          variant="outline"
          className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-primary/30 font-bold shadow-sm transition-all gap-3 cursor-pointer"
        >
          <span>
            <UploadCloud className="w-5 h-5 text-primary" />
            {loading ? "Odczyt..." : "Importuj Excel"}
          </span>
        </Button>
      </label>
    </div>
  );
}
