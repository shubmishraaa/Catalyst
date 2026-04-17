"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/shopper/BottomNav";
import { User, ShieldAlert, LogOut, ChevronRight, History } from "lucide-react";
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

  const handleToggleAllergen = async (id: string) => {
    if (!user) return;

    const nextAllergens = allergens.includes(id)
      ? allergens.filter((allergen) => allergen !== id)
      : [...allergens, id];

    setSaving(id);
    try {
      await setDoc(doc(db, "users", user.uid), { allergens: nextAllergens }, { merge: true });
      toast({ title: "Preferences updated" });
    } catch (err: any) {
      toast({ title: "Could not save preferences", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const allergenList = [
    { id: "gluten", label: "Gluten" },
    { id: "dairy", label: "Dairy" },
    { id: "nuts", label: "Nuts" },
    { id: "soy", label: "Soy" },
    { id: "shellfish", label: "Shellfish" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="p-6 pt-12 max-w-lg mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userName}</h1>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-accent" />
            Dietary Preferences
          </h2>
          <Card className="rounded-3xl border-none bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Highlight allergens</p>
              <div className="grid grid-cols-1 gap-4">
                {allergenList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <Label htmlFor={item.id} className="text-base font-medium cursor-pointer">{item.label}</Label>
                    <Checkbox
                      id={item.id}
                      checked={allergens.includes(item.id)}
                      disabled={saving === item.id}
                      onCheckedChange={() => handleToggleAllergen(item.id)}
                      className="h-6 w-6 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Shopping History
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border group cursor-pointer">
              <div className="space-y-1">
                <p className="font-semibold">All Sessions</p>
                <p className="text-xs text-muted-foreground">View all past digital receipts</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
          </div>
        </section>

        <Button
          variant="secondary"
          onClick={handleLogout}
          className="w-full h-14 rounded-2xl text-destructive font-bold bg-destructive/5 hover:bg-destructive/10 border-none"
        >
          <LogOut className="h-5 w-5 mr-2" /> Log Out
        </Button>
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
