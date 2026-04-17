"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/shopper/BottomNav";
import { QrCode, Clock, ShieldAlert, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc } from "firebase/firestore";

export default function ShopperHome() {
  const { user, profile, loading } = useAuth();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [updatingAlerts, setUpdatingAlerts] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const router = useRouter();
  const { itemCount } = useCart();

  useEffect(() => {
    setAlertsEnabled(profile?.allergenAlertsEnabled !== false);
  }, [profile?.allergenAlertsEnabled]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const fetchSessions = async () => {
      try {
        const q = query(
          collection(db, "sessions"),
          where("userId", "==", user.uid),
          where("status", "==", "completed"),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const snapshot = await getDocs(q);
        setRecentSessions(snapshot.docs.map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() })));
      } catch (err) {
        console.error("Error fetching sessions", err);
      }
    };

    fetchSessions();
  }, [user, router, loading]);

  const toggleAlerts = async (nextValue: boolean) => {
    if (!user) return;

    setAlertsEnabled(nextValue);
    setUpdatingAlerts(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { allergenAlertsEnabled: nextValue },
        { merge: true }
      );
    } catch (err) {
      console.error("Error updating allergen alerts", err);
      setAlertsEnabled(profile?.allergenAlertsEnabled !== false);
    } finally {
      setUpdatingAlerts(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="p-6 pt-12 space-y-8 max-w-lg mx-auto">
        <header className="space-y-1">
          <p className="text-muted-foreground text-sm">Hi,</p>
          <h1 className="text-3xl font-bold">{profile?.name || "Shopper"}</h1>
        </header>

        <section>
          <Button
            onClick={() => router.push("/shopper/qr-start")}
            className="w-full h-32 rounded-3xl flex flex-col gap-3 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
          >
            <div className="bg-white/20 p-3 rounded-2xl">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            Scan Store QR
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" />
              Dietary Alerts
            </h2>
            <Switch
              checked={alertsEnabled}
              disabled={updatingAlerts}
              onCheckedChange={toggleAlerts}
            />
          </div>
          <Card className="rounded-2xl border-none bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Allergen warnings are currently{" "}
                <span className="font-bold text-foreground">
                  {alertsEnabled ? "ON" : "OFF"}
                </span>
                . We only warn when a scanned product matches your saved allergens.
              </p>
            </CardContent>
          </Card>
        </section>

        {recentSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Trips
            </h2>
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
                const dateStr = session.createdAt?.seconds
                  ? new Date(session.createdAt.seconds * 1000).toLocaleDateString(undefined, dateOptions)
                  : "Recently";

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border hover:border-primary transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{session.storeId}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-bold">Rs. {session.totalAmount || 0}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
