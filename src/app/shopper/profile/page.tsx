"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BottomNav } from "@/components/shopper/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function ShopperProfile() {
  const { user, profile } = useAuth();
  const { itemCount } = useCart();
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const allergens = profile?.allergens || [];
  const userName = profile?.name || "Shopper";
  const email = user?.email || "user@example.com";

  const allergenList = [
    { id: "gluten", label: "Gluten" },
    { id: "dairy", label: "Dairy" },
    { id: "nuts", label: "Nuts" },
    { id: "soy", label: "Soy" },
    { id: "shellfish", label: "Shellfish" },
  ];

  const handleToggleAllergen = async (id: string) => {
    if (!user) return;
    const nextAllergens = allergens.includes(id) ? allergens.filter((allergen) => allergen !== id) : [...allergens, id];
    setSaving(id);
    try {
      await setDoc(doc(db, "users", user.uid), { allergens: nextAllergens }, { merge: true });
      toast({ title: "Preferences updated" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="shopper-shell page-transition min-h-screen pb-32">
      <div className="mx-auto max-w-lg px-5 pt-10">
        <div className="shopper-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary/10 text-2xl font-extrabold text-primary">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="shopper-label">Profile</p>
              <h1 className="truncate text-[22px] font-extrabold tracking-[-0.5px]">{userName}</h1>
              <p className="truncate text-[12px] text-[color:var(--shopper-text-secondary)]">{email}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 shopper-card p-4">
          <p className="shopper-label">Dietary preferences</p>
          <div className="mt-4 space-y-3">
            {allergenList.map((item) => (
              <label key={item.id} className="flex items-center justify-between rounded-xl bg-[color:var(--shopper-surface-2)] px-3 py-3 text-[13px]">
                <span className="font-bold">{item.label}</span>
                <Checkbox checked={allergens.includes(item.id)} disabled={saving === item.id} onCheckedChange={() => handleToggleAllergen(item.id)} className="h-5 w-5 rounded-md" />
              </label>
            ))}
          </div>
        </div>

        <Button variant="destructive" onClick={() => signOut(auth).then(() => router.replace("/login"))} className="mt-5 h-12 w-full rounded-[14px]">
          Log out
        </Button>
      </div>
      <BottomNav cartCount={itemCount} />
    </div>
  );
}
