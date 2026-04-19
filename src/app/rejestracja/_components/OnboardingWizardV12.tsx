// src/app/rejestracja/_components/OnboardingWizardV12.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Mail, Lock, ShieldCheck, 
  ChevronRight, ChevronLeft, CheckCircle2,
  Building, Fingerprint, MapPin, Zap
} from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

interface IOnboardingWizardV12Props {
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

import { validateNip, calculatePasswordStrength, validateEmail } from "@/lib/validation";

export function OnboardingWizardV12({ onSubmit, loading }: IOnboardingWizardV12Props) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nip: "",
    companyName: ""
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const isStep1Valid = validateEmail(formData.email) && calculatePasswordStrength(formData.password) >= 1;
  const isStep2Valid = validateNip(formData.nip) && formData.companyName;

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStep2Valid) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* PROGRESS INDICATOR */}
      <div className="flex items-center justify-center gap-12 mb-12">
         <StepIndicator active={step >= 1} current={step === 1} label="Autoryzacja" index={1} />
         <div className={`h-[2px] w-20 transition-all duration-1000 ${step > 1 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`} />
         <StepIndicator active={step >= 2} current={step === 2} label="Tożsamość B2B" index={2} />
      </div>

      <div className="glass-modal p-12 rounded-[4rem] relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 ? (
             <motion.div 
               key="step1"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
               className="space-y-10"
             >
                <div className="space-y-3">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                         <Fingerprint className="w-6 h-6" />
                      </div>
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase">Credo <span className="text-primary italic">Zabezpieczeń</span></h2>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Pierwszy krok do zunifikowanej sieci partnerskiej Celtronics.</p>
                </div>

                <div className="space-y-6">
                   <InputField 
                     label="Adres E-mail" 
                     icon={<Mail />} 
                     type="email" 
                     placeholder="jan.kowalski@firma.pl"
                     value={formData.email}
                     onChange={(v) => setFormData(s => ({ ...s, email: v }))}
                   />
                   <div className="space-y-2">
                     <InputField 
                       label="Hasło Dostępowe" 
                       icon={<Lock />} 
                       type="password" 
                       placeholder="Min. 8 znaków (V12 Standard)"
                       value={formData.password}
                       onChange={(v) => setFormData(s => ({ ...s, password: v }))}
                     />
                     <PasswordStrengthMeter password={formData.password} />
                   </div>
                </div>

                <button 
                  disabled={!isStep1Valid}
                  onClick={nextStep}
                  className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 shadow-ks-lg"
                >
                  Kontynuuj do Tożsamości <ChevronRight className="w-4 h-4" />
                </button>
             </motion.div>
          ) : (
             <motion.div 
               key="step2"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
               className="space-y-10"
               onSubmit={handleFinalSubmit}
             >
                <div className="space-y-3">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                         <Building2 className="w-6 h-6" />
                      </div>
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase">Profil <span className="text-emerald-600 italic">Kontrahenta</span></h2>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Wymogi prawne KSeF: Weryfikacja NIP oraz tożsamości podatkowej.</p>
                </div>

                <form onSubmit={handleFinalSubmit} className="space-y-6">
                   <InputField 
                     label="Numer NIP (Bez myślników)" 
                     icon={<ShieldCheck />} 
                     type="text" 
                     placeholder="1234567890"
                     maxLength={10}
                     value={formData.nip}
                     onChange={(v) => setFormData(s => ({ ...s, nip: v.replace(/\D/g, '') }))}
                   />
                   <InputField 
                     label="Oficjalna Nazwa Firmy" 
                     icon={<Building />} 
                     type="text" 
                     placeholder="Np. Celtronics Systemy Zabezpieczeń S.C."
                     value={formData.companyName}
                     onChange={(v) => setFormData(s => ({ ...s, companyName: v }))}
                   />

                   <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={prevStep}
                        className="w-20 h-16 glass-card rounded-[2rem] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:scale-105"
                      >
                         <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button 
                        type="submit"
                        disabled={!isStep2Valid || loading}
                        className="flex-1 h-16 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        {loading ? "Szyfrowanie Danych..." : "Zainicjuj Przystąpienie"} <Zap className="w-4 h-4 fill-white" />
                      </button>
                   </div>
                </form>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepIndicator({ active, current, label, index }: any) {
  return (
    <div className="flex flex-col items-center gap-3">
       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-700 ${active ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          {active && !current ? <CheckCircle2 className="w-6 h-6" /> : index}
       </div>
       <span className={`text-[9px] font-black uppercase tracking-[0.25em] transition-colors ${active ? 'text-foreground' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function InputField({ label, icon, type, placeholder, value, onChange, maxLength }: any) {
  return (
    <div className="space-y-3 group">
       <div className="flex items-center gap-2 px-1">
          <div className="text-primary group-focus-within:scale-125 transition-transform duration-500">
             {icon && typeof icon !== 'string' ? { ...icon, props: { ...icon.props, className: 'w-3 h-3' } } : null}
          </div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-foreground transition-colors">{label}</label>
       </div>
       <input 
         type={type} 
         placeholder={placeholder}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         maxLength={maxLength}
         className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-bold tracking-tight text-lg"
       />
    </div>
  );
}
