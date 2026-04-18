"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, AlertCircle, Package, History, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[color:var(--admin-main-bg)]">Loading...</div>;

  if (role !== "admin") {
    const destination = user ? "/shopper/home" : "/login";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-[color:var(--admin-main-bg)] p-6 text-center text-[color:var(--admin-text)]">
        <h1 className="text-2xl font-extrabold">Unauthorized</h1>
        <p className="text-[13px] text-[color:var(--admin-muted)]">You do not have administrative privileges.</p>
        <Button onClick={() => router.replace(destination)} className="rounded-xl">
          {user ? "Go to Shopper App" : "Go to Login"}
        </Button>
      </div>
    );
  }

  const items = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/sessions", label: "Sessions", icon: Users },
    { href: "/admin/flags", label: "Flags", icon: AlertCircle },
    { href: "/admin/audits", label: "Audits", icon: History },
    { href: "/admin/products", label: "Products", icon: Package },
  ];
  const initials = (user?.displayName || user?.email || "A").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[color:var(--admin-main-bg)] text-[color:var(--admin-text)] md:flex">
      <aside className="flex w-full shrink-0 flex-row items-center gap-3 border-b border-[color:#1e2d45] bg-[#0f172a] px-3 py-3 md:min-h-screen md:w-[200px] md:flex-col md:items-stretch md:gap-8 md:border-b-0 md:border-r md:px-4 md:py-5">
        <div className="flex items-center gap-3 border-b border-[color:#1e2d45] pb-3 md:pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">C</div>
          <div className="hidden md:block">
            <p className="text-[15px] font-extrabold text-[color:#f0f4ff]">Catalyst</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:#4a5568]">Control Center</p>
          </div>
        </div>

        <nav className="flex flex-1 items-center gap-2 overflow-x-auto md:flex-col md:items-stretch md:overflow-visible">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[44px] items-center justify-center gap-3 rounded-xl border-r-2 border-transparent px-3 py-2 text-[12px] font-semibold text-[color:#4a5568] transition-colors hover:bg-white/5 hover:text-[color:#f0f4ff] md:justify-start",
                  active && "bg-primary/10 text-primary md:border-r-primary"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-[color:#1e2d45] pt-4 md:block">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:#1e2d45] text-[11px] font-extrabold text-primary">{initials}</div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-[color:#f0f4ff]">{user?.displayName || user?.email || "Admin"}</p>
              <p className="text-[10px] text-[color:#4a5568]">Store admin</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => signOut(auth).then(() => router.replace("/login"))} className="w-full justify-start gap-3 rounded-xl px-3 text-[color:#ff4757] hover:bg-[#ff475714] hover:text-[color:#ff4757]">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
