"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scan, ShoppingCart, User, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Home", icon: Home, href: "/shopper/home" },
    { label: "Scan", icon: Scan, href: "/shopper/scan" },
    { label: "Cart", icon: ShoppingCart, href: "/shopper/cart", badge: cartCount },
    { label: "Profile", icon: User, href: "/shopper/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-1)]/95 px-4 pb-7 pt-2 backdrop-blur-md sm:pb-4">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-w-[62px] flex-col items-center gap-1.5 py-1",
                isActive ? "text-primary" : "text-[color:var(--shopper-text-muted)] hover:text-[color:var(--shopper-text-primary)]"
              )}
            >
              <div className={cn("relative rounded-xl p-2 transition-all duration-200", isActive && "bg-primary/10")}>
                <item.icon className="h-6 w-6" />
                {(item.badge || 0) > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground">
                    {item.badge && item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{item.label}</span>
              <span className={cn("h-1 w-1 rounded-full bg-transparent", isActive && "bg-primary")} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
