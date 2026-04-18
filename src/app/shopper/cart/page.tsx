"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shopper/BottomNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Minus, Plus, ShoppingCart, AlertTriangle, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Cart() {
  const { activeSession, loadingSession } = useSession();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { items, itemCount, subtotal, savings, total, loadingCart } = useCart();
  const alertsEnabled = profile?.allergenAlertsEnabled !== false;
  const userAllergens = (profile?.allergens || []).map((allergen) => allergen.trim().toLowerCase());

  useEffect(() => {
    if (loading || loadingSession) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!activeSession) {
      router.replace("/shopper/qr-start");
    }
  }, [activeSession, loading, loadingSession, router, user]);

  if (loading || loadingSession || loadingCart) {
    return <div className="shopper-shell flex min-h-screen items-center justify-center text-[13px] text-[color:var(--shopper-text-secondary)]">Loading cart...</div>;
  }

  const updateQty = async (id: string, currentQty: number, delta: number, name: string) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await deleteDoc(doc(db, "cartItems", id));
      toast({ title: "Item removed", description: `${name} removed from cart.` });
    } else {
      await updateDoc(doc(db, "cartItems", id), { quantity: newQty });
    }
  };

  const clearCart = async () => {
    await Promise.all(items.map((item) => deleteDoc(doc(db, "cartItems", item.id))));
  };

  const warningItem = items.find((item) =>
    alertsEnabled && (item.allergens || []).some((allergen) => userAllergens.includes(allergen.trim().toLowerCase()))
  );

  return (
    <div className="shopper-shell page-transition min-h-screen pb-40">
      <div className="mx-auto max-w-lg px-5 pt-10">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.5px]">Your cart</h1>
            <p className="mt-1 text-[12px] text-[color:var(--shopper-text-secondary)]">{activeSession?.storeId || "Store"} · {itemCount} items</p>
          </div>
          <Button variant="destructive" className="h-8 rounded-lg px-3 text-[12px]" onClick={clearCart}>Clear all</Button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--shopper-surface-2)] text-[color:var(--shopper-text-secondary)]">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h2 className="text-[15px] font-bold">Your cart is empty</h2>
            <p className="mt-2 max-w-[260px] text-[12px] text-[color:var(--shopper-text-secondary)]">Start scanning products to add them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {warningItem ? (
              <div className="rounded-xl border border-[#ff475733] bg-[#ff47570a] p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-[#ff4757]" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#ff4757]">Allergen alert</p>
                    <p className="text-[10px] text-[color:var(--shopper-text-secondary)]">{warningItem.name} matches one of your saved allergens.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {items.map((item) => (
              <div key={item.id} className="shopper-card flex gap-3 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--shopper-surface-2)] text-lg">🛒</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{item.name}</p>
                  <p className="mt-1 text-[13px] font-bold text-primary">{formatCurrency(Number(item.price || 0))}</p>
                  {item.offer?.discountPercent ? (
                    <span className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] text-primary">Offer applied</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 self-center">
                  <button onClick={() => updateQty(item.id, item.quantity, -1, item.name)} className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-2)]">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center text-[13px] font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity, 1, item.name)} className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-2)]">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 z-40">
        <div className="mx-auto max-w-lg px-5">
          <div className="rounded-t-[18px] border-t border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-1)] p-4">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between text-[color:var(--shopper-text-secondary)]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {savings > 0 ? <div className="flex justify-between text-primary"><span>Savings</span><span>{formatCurrency(savings)}</span></div> : null}
              <div className="my-2 h-px bg-[color:var(--shopper-border)]" />
              <div className="flex justify-between text-[15px] font-extrabold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <Button onClick={() => router.push("/shopper/checkout")} className="mt-4 flex h-12 w-full items-center justify-between rounded-[14px] bg-primary px-4 text-primary-foreground">
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Pay with UPI</span>
              <span>{formatCurrency(total)} →</span>
            </Button>
          </div>
        </div>
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
