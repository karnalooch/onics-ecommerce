"use client";

import { useState } from "react";
import { 
  Building2, Mail, Lock, ShieldCheck, 
  ChevronRight, ChevronLeft, CheckCircle2,
  Building, Zap, FileText
} from "lucide-react";
import { validateNip, calculatePasswordStrength, validateEmail } from "@/lib/validation";

interface IOnboardingFormData {
  email: string;
  password: string;
  nip: string;
  companyName: string;
  phone: string;
  address: string;
  consentVat: boolean;
  consentReg: boolean;
}

interface IOnboardingProps {
  onSubmit: (data: IOnboardingFormData) => Promise<void>;
  loading: boolean;
}

export function OnboardingMissionControl({ onSubmit, loading }: IOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<IOnboardingFormData>({
    email: "",
    password: "",
    nip: "",
    companyName: "",
    phone: "",
    address: "",
    consentVat: false,
    consentReg: false
  });

  const nextStep = () => setStep(s => (s + 1) as 1 | 2 | 3);
  const prevStep = () => setStep(s => (s - 1) as 1 | 2 | 3);

  const isStep1Valid = validateEmail(formData.email) && calculatePasswordStrength(formData.password) >= 1;
  const isStep2Valid = validateNip(formData.nip) && formData.companyName.length > 3;
  const isStep3Valid = formData.consentReg;

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStep3Valid) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="flex flex-col bg-white overflow-hidden">
      {/* COMPACT MISSION CONTROL STEPPER - V4 ERGONOMIC */}
      <div className="flex items-center justify-between px-6 py-3 bg-secondary/10 border-b border-border">
         <div className="flex items-center gap-8">
            <TechnicalStep active={step >= 1} label="Auth" index={1} />
            <TechnicalStep active={step >= 2} label="Entity" index={2} />
            <TechnicalStep active={step >= 3} label="Legal" index={3} />
         </div>
         <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500 ease-snap" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tabular-nums">Step 0{step}</span>
         </div>
      </div>

      <div className="p-8">
        {step === 1 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TechnicalInput 
                  label="E-Mail Protocol" 
                  icon={<Mail className="w-3 h-3"/>} 
                  type="email" 
                  placeholder="name@provider.com"
                  value={formData.email}
                  onChange={(v) => setFormData(s => ({ ...s, email: v }))}
                />
                <TechnicalInput 
                  label="Secure Access Key" 
                  icon={<Lock className="w-3 h-3"/>} 
                  type="password" 
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(v) => setFormData(s => ({ ...s, password: v }))}
                />
              </div>
              
              <div className="p-4 bg-primary/5 border-l-2 border-primary rounded-r flex gap-4">
                 <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-primary">Identity Verification</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-tight opacity-70">
                       Konta B2B wymagają weryfikacji ręcznej przez administratora Celtronics.
                    </p>
                 </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                   disabled={!isStep1Valid}
                   onClick={nextStep}
                   className="h-8 px-6 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm shadow-lg shadow-primary/10 hover:shadow-primary/30 disabled:opacity-20 transition-all flex items-center gap-2"
                 >
                   Continuum <ChevronRight className="w-3 h-3" />
                 </button>
              </div>
           </div>
        )}

        {step === 2 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TechnicalInput 
                  label="NIP / TAX Identifier" 
                  icon={<ShieldCheck className="w-3 h-3"/>} 
                  type="text" 
                  placeholder="123-456-78-90"
                  maxLength={10}
                  value={formData.nip}
                  onChange={(v) => setFormData(s => ({ ...s, nip: v.replace(/\D/g, '') }))}
                />
                <div className="md:col-span-2">
                  <TechnicalInput 
                    label="Business Entity Name" 
                    icon={<Building className="w-3 h-3"/>} 
                    type="text" 
                    placeholder="Wpisz oficjalną nazwę firmy"
                    value={formData.companyName}
                    onChange={(v) => setFormData(s => ({ ...s, companyName: v }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TechnicalInput 
                  label="Technical Contact" 
                  icon={<Zap className="w-3 h-3"/>} 
                  type="text" 
                  placeholder="Numer telefonu"
                  value={formData.phone}
                  onChange={(v) => setFormData(s => ({ ...s, phone: v }))}
                />
                <TechnicalInput 
                  label="Registered Address" 
                  icon={<Building2 className="w-3 h-3"/>} 
                  type="text" 
                  placeholder="Ulica, Miasto, Kod"
                  value={formData.address}
                  onChange={(v) => setFormData(s => ({ ...s, address: v }))}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                 <button onClick={prevStep} className="text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all flex items-center gap-2">
                    <ChevronLeft className="w-3 h-3" /> Back
                 </button>
                 <button 
                   onClick={nextStep}
                   disabled={!isStep2Valid}
                   className="h-8 px-8 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2"
                 >
                   Establish Profile <ChevronRight className="w-3 h-3" />
                 </button>
              </div>
           </div>
        )}

        {step === 3 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 border-b border-border pb-2">Legal Declarations</h3>
                 
                 <ConsentBox 
                    label="Akceptuję regulamin platformy B2B Celtronics"
                    checked={formData.consentReg}
                    onChange={(v) => setFormData(s => ({ ...s, consentReg: v }))}
                 />

                 <ConsentBox 
                    label="Zgadzam się na otrzymywanie faktur drogą elektroniczną (e-Faktura)"
                    checked={formData.consentVat}
                    onChange={(v) => setFormData(s => ({ ...s, consentVat: v }))}
                 />

                 <div className="p-4 bg-action/5 border border-action/20 rounded flex gap-4 mt-6">
                    <FileText className="w-4 h-4 text-action shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-action-foreground uppercase tracking-tight leading-relaxed">
                       Po wysłaniu zgłoszenia nasi specjaliści zweryfikują Twoje uprawnienia instalatorskie. Dostęp do cen hurtowych zostanie przyznany w ciągu 24h.
                    </p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                 <button onClick={prevStep} className="text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all flex items-center gap-2">
                    <ChevronLeft className="w-3 h-3" /> Revisio
                 </button>
                 <button 
                   onClick={handleFinalSubmit}
                   disabled={!isStep3Valid || loading}
                   className="h-10 px-10 bg-action text-action-foreground text-[11px] font-black uppercase tracking-[0.3em] rounded-sm shadow-xl shadow-action/10 hover:shadow-action/30 disabled:opacity-20 transition-all flex items-center gap-3 active:scale-95"
                 >
                   {loading ? "Transmitting..." : "Synchronize Database"} <CheckCircle2 className="w-4 h-4" />
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

function TechnicalStep({ active, label, index }: { active: boolean; label: string; index: number }) {
  return (
    <div className="flex items-center gap-3">
       <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black transition-all ${active ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-secondary text-muted-foreground opacity-40'}`}>
          {index}
       </div>
       <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? 'text-foreground' : 'text-muted-foreground opacity-20 hover:opacity-40 transition-opacity'}`}>
         {label}
       </span>
    </div>
  );
}

function TechnicalInput({ label, icon, type, placeholder, value, onChange, maxLength }: { label: string; icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <div className="flex flex-col gap-2 group">
      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-2 px-0.5 group-focus-within:text-primary transition-colors">
        {icon} {label}
      </label>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full h-9 px-3 bg-secondary/10 border border-border rounded-sm text-[11px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary focus:bg-white inner-shadow-technical transition-all tracking-tight"
      />
    </div>
  );
}

function ConsentBox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
   return (
      <label className="flex items-center gap-3 p-3 bg-secondary/5 border border-transparent hover:border-border transition-all cursor-pointer rounded-sm group">
         <div className={`w-4 h-4 rounded-sm border border-border flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'bg-white'}`}>
            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
         </div>
         <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
         <span className={`text-[10px] font-bold uppercase tracking-tight transition-all ${checked ? 'text-foreground' : 'text-muted-foreground opacity-60 group-hover:opacity-100'}`}>
            {label}
         </span>
      </label>
   );
}
