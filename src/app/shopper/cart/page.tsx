"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/shopper/BottomNav";
import { Minus, Plus, Trash2, ArrowRight, Wallet, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SessionBanner } from "@/components/shopper/SessionBanner";

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    );
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
    for (const item of items) {
      await deleteDoc(doc(db, "cartItems", item.id));
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-muted p-8 rounded-full mb-6 text-primary">
          <Trash2 className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty - start scanning!</h2>
        <p className="text-muted-foreground mb-8">Ready to start shopping? Head back to the scanner.</p>
        <Button onClick={() => router.push("/shopper/scan")} className="w-full rounded-2xl h-14 font-bold text-lg text-white">
          Start Scanning
        </Button>
        <BottomNav cartCount={itemCount} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="p-6 pt-12 max-w-lg mx-auto space-y-8">
        <SessionBanner />
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Your Cart</h1>
            <p className="text-muted-foreground text-sm">Session active - {itemCount} items</p>
          </div>
          <Button variant="ghost" className="text-destructive font-bold p-0 h-auto" onClick={clearCart}>
            Clear All
          </Button>
        </header>

        <div className="space-y-4">
          {items.map((item) => {
            const matchingAllergens = (item.allergens || []).filter((allergen) =>
              userAllergens.includes(allergen.trim().toLowerCase())
            );

            return (
              <div key={item.id} className="flex gap-4 p-4 bg-card rounded-3xl border border-border">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : "No Image"}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                    <p className="text-primary font-bold">Rs. {item.price}</p>
                    <p className="text-xs text-muted-foreground">
                      Item total: Rs. {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                    </p>
                    {alertsEnabled && matchingAllergens.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
                        <p className="flex items-center gap-2 text-xs font-semibold">
                          <AlertTriangle className="h-4 w-4" />
                          Allergen warning
                        </p>
                        <p className="mt-1 text-xs">
                          Matches your saved allergens: {matchingAllergens.join(", ")}.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {item.offer?.discountPercent ? (
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {item.offer.discountPercent}% off
                      </span>
                    ) : null}
                    <div className="flex items-center gap-3 bg-muted rounded-full p-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background"
                        onClick={() => updateQty(item.id, item.quantity, -1, item.name)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-bold text-sm min-w-[1rem] text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background"
                        onClick={() => updateQty(item.id, item.quantity, 1, item.name)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="p-6 bg-muted/30 rounded-3xl space-y-4">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-bold">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-accent">
            <span>Savings</span>
            <span className="font-bold">-Rs. {savings.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
        </section>

        <div className="fixed bottom-24 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-40">
          <Button
            onClick={() => router.push("/shopper/checkout")}
            className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 bg-primary flex justify-between px-8"
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6" />
              <span>Checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Rs. {total.toFixed(2)}</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
