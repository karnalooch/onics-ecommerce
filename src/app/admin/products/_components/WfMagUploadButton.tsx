// src/app/admin/products/_components/WfMagUploadButton.tsx
"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
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
        toast.success(`LOG: Wczytano ${data.length} wierszy danych WF-Mag.`);
      } catch (err) {
        toast.error("FAULT: Błąd parsowania pliku .xls / .xlsx");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
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
      <label 
        htmlFor="wfmag-upload-input" 
        className={`inline-flex items-center gap-4 h-11 px-8 bg-slate-950 text-white font-black text-[10px] uppercase tracking-[0.2em] italic active-press active-inset cursor-pointer transition-all ${disabled || loading ? 'opacity-30 pointer-events-none' : 'hover:bg-primary'}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-primary" />
        )}
        <span>{loading ? "LOAD_DATA..." : "IMPORT_WF_MAG"}</span>
      </label>
    </div>
  );
}
