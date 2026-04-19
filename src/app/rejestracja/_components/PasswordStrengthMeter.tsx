// src/app/rejestracja/_components/PasswordStrengthMeter.tsx
"use client";

import { useEffect, useState } from "react";
import { Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IPasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: IPasswordStrengthMeterProps) {
  const [isCapsLock, setIsCapsLock] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setIsCapsLock(e.getModifierState("CapsLock"));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(password);
  
  const colors = [
    "bg-slate-200 dark:bg-slate-800",
    "bg-destructive",
    "bg-warning",
    "bg-primary",
    "bg-success"
  ];

  const labels = [
    "Minimalna Ochrona",
    "Słabe Hasło",
    "Średni Poziom",
    "Silne Hasło",
    "Militarny Standard V12"
  ];

  return (
    <div className="space-y-4 mt-4">
      {/* CAPS LOCK ALERT */}
      <AnimatePresence>
        {isCapsLock && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-xl"
          >
            <Zap className="w-4 h-4 fill-warning animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Uwaga: CAPS LOCK jest włączony</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STRENGTH BARS */}
      <div className="flex flex-col gap-2">
         <div className="flex justify-between items-center px-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Poziom Entropii</span>
            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${strength > 0 ? 'text-foreground' : 'text-slate-400'}`}>
              {labels[strength]}
            </span>
         </div>
         <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            {[1, 2, 3, 4].map((seg) => (
              <div 
                key={seg}
                className={`flex-1 rounded-full transition-all duration-700 ${strength >= seg ? colors[strength] : 'bg-transparent'}`}
              />
            ))}
         </div>
      </div>

      {/* REQUIREMENTS LIST */}
      <div className="grid grid-cols-2 gap-2 mt-4">
         <Requirement met={password.length >= 8} label="Min. 8 Znaków" />
         <Requirement met={/[A-Z]/.test(password)} label="Wielka Litera" />
         <Requirement met={/[0-9]/.test(password)} label="Cyfra" />
         <Requirement met={/[^A-Za-z0-9]/.test(password)} label="Znak Specjalny" />
      </div>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
       {met ? (
         <CheckCircle2 className="w-3 h-3 text-emerald-500" />
       ) : (
         <div className="w-3 h-3 rounded-full border-2 border-slate-200 dark:border-slate-800" />
       )}
       <span className={`text-[8px] font-black uppercase tracking-widest ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
         {label}
       </span>
    </div>
  );
}
