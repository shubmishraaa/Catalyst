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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border flex justify-around items-center py-2 px-4 pb-8 sm:pb-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors duration-200 relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isActive && "bg-primary/10"
            )}>
              <item.icon className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
            {(item.badge || 0) > 0 ? (
              <span className="absolute -top-1 right-2 bg-accent text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-in zoom-in duration-300">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
