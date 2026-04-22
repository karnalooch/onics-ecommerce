"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  Wrench, 
  Settings, 
  Search,
  Bell,
  UserCircle,
  MoreHorizontal,
  LayoutDashboard,
  ShieldAlert,
  LogOut,
  Sun,
  Moon
} from "lucide-react"

export function IconicNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  // Avoid hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  const navItems = [
    { name: "Start", path: "/", icon: Home },
    { name: "Pulpit", path: "/admin", icon: LayoutDashboard },
    { name: "Katalog", path: "/admin/products", icon: Package },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Oferty", path: "/admin/quotes", icon: FileText },
    { name: "Serwis", path: "/admin/repairs", icon: Wrench },
    { name: "System", path: "/admin/categories", icon: Settings },
  ];

  const activePath = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-[100] px-4 py-2 w-full transition-all duration-500">
      <div className="max-w-[1920px] mx-auto w-full glass-mica rounded-xl flex items-center justify-between px-6 py-2 shadow-2xl border-white/20">
        
        {/* 1. BRANDING (WINDOWS 11 STYLE) */}
        <Link href="/" className="flex items-center gap-3 mr-8 group active-press">
           <div className="w-10 h-10 bg-[#0078d4] text-white flex items-center justify-center rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
           </div>
           <div className="flex flex-col leading-none">
              <span className="text-[14px] font-extrabold tracking-tight text-foreground">CEL-TRONICS</span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Engineering Hub</span>
           </div>
        </Link>

        {/* 2. FLUENT NAVIGATION (GHOST BUTTONS) */}
        <div className="flex-1 flex items-center gap-1 xl:gap-2">
           {navItems.map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all active-press group ${
                  activePath(item.path) 
                     ? 'bg-primary/10 text-primary font-bold' 
                     : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                }`}
              >
                 <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activePath(item.path) ? 'text-primary' : ''}`} />
                 <span className="text-[11px] uppercase tracking-wider hidden lg:inline">{item.name}</span>
              </Link>
           ))}
        </div>

        {/* 3. UTILITIES & THEME TOGGLE */}
        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-black/5 dark:border-white/10">
           
           {/* THEME TOGGLE */}
           {mounted && (
             <button 
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all active-press"
               title="Przełącz motyw"
             >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
             </button>
           )}

           <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground active-press">
              <Bell className="w-4 h-4" />
           </button>

           {/* USER PILL */}
           {isAuthenticated ? (
              <div className="flex items-center gap-3 ml-2">
                 <Link href="/admin/profile" className="flex items-center gap-2 pl-1 pr-3 py-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-pill hover:bg-black/10 dark:hover:bg-white/10 transition-all active-press">
                    <UserCircle className="w-7 h-7 text-primary" />
                    <span className="text-[11px] font-bold text-foreground hidden sm:inline">
                      {session.user?.name?.split(' ')[0] || "Panel"}
                    </span>
                 </Link>
                 
                 <button 
                   onClick={() => signOut({ callbackUrl: "/" })}
                   className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active-press"
                   title="Wyloguj"
                 >
                    <LogOut className="w-4 h-4" />
                 </button>
              </div>
           ) : isLoading ? (
              <div className="w-20 h-8 bg-black/5 dark:bg-white/5 animate-pulse rounded-lg" />
           ) : (
              <Link 
                href="/logowanie"
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-[11px] uppercase tracking-wider hover:brightness-110 active-press shadow-lg shadow-primary/20"
              >
                 Zaloguj
              </Link>
           )}
        </div>
      </div>
    </nav>
  )
}
