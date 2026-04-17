"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, AlertCircle, Package, History, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (role !== "admin") {
    const destination = user ? "/shopper/home" : "/login";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
         <h1 className="text-2xl font-bold">Unauthorized</h1>
         <p>You do not have administrative privileges.</p>
         <Button onClick={() => router.replace(destination)} className="rounded-xl">
           {user ? "Go to Shopper App" : "Go to Login"}
         </Button>
      </div>
    );
  }

  const activeClass = "bg-primary/10 text-primary font-bold";
  const inactiveClass = "text-muted-foreground hover:bg-muted/50 hover:text-foreground";

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border p-6 hidden lg:flex flex-col gap-8 bg-card">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Catalyst</h1>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <Button variant="ghost" asChild className={`w-full justify-start gap-3 rounded-xl ${pathname === '/admin/dashboard' ? activeClass : inactiveClass}`}>
            <Link href="/admin/dashboard"><LayoutDashboard className="h-5 w-5" /> Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild className={`w-full justify-start gap-3 rounded-xl ${pathname === '/admin/sessions' ? activeClass : inactiveClass}`}>
            <Link href="/admin/sessions"><Users className="h-5 w-5" /> Sessions</Link>
          </Button>
          <Button variant="ghost" asChild className={`w-full justify-start gap-3 rounded-xl ${pathname === '/admin/flags' ? activeClass : inactiveClass}`}>
            <Link href="/admin/flags"><AlertCircle className="h-5 w-5" /> Flags</Link>
          </Button>
          <Button variant="ghost" asChild className={`w-full justify-start gap-3 rounded-xl ${pathname === '/admin/audits' ? activeClass : inactiveClass}`}>
             <Link href="/admin/audits"><History className="h-5 w-5" /> Audits</Link>
          </Button>
          <Button variant="ghost" asChild className={`w-full justify-start gap-3 rounded-xl ${pathname === '/admin/products' ? activeClass : inactiveClass}`}>
             <Link href="/admin/products"><Package className="h-5 w-5" /> Products</Link>
          </Button>
        </nav>
        
        <Button variant="ghost" onClick={() => signOut(auth).then(() => router.replace("/login"))} className="w-full justify-start gap-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-5 w-5" /> Sign Out
        </Button>
      </aside>
      
      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
