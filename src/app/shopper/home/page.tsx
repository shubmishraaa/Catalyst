"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shopper/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/lib/contexts/SessionContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc } from "firebase/firestore";
import { Moon, Sun, QrCode, ShieldAlert, ChevronRight, Store } from "lucide-react";
import { formatCurrency, timeAgo } from "@/lib/utils";

export default function ShopperHome() {
  const { user, profile, loading } = useAuth();
  const { activeSession } = useSession();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [time, setTime] = useState("");
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [updatingAlerts, setUpdatingAlerts] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

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
      const q = query(
        collection(db, "sessions"),
        where("userId", "==", user.uid),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const snapshot = await getDocs(q);
      setRecentSessions(snapshot.docs.map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() })));
    };

    void fetchSessions();
  }, [loading, router, user]);

  const firstName = useMemo(() => (profile?.name || "Shopper").split(" ")[0], [profile?.name]);
  const allergens = profile?.allergens || [];

  const toggleAlerts = async (nextValue: boolean) => {
    if (!user) return;
    setAlertsEnabled(nextValue);
    setUpdatingAlerts(true);
    try {
      await setDoc(doc(db, "users", user.uid), { allergenAlertsEnabled: nextValue }, { merge: true });
    } finally {
      setUpdatingAlerts(false);
    }
  };

  return (
    <div className="shopper-shell page-transition pb-32 text-[color:var(--shopper-text-primary)]">
      <div className="mx-auto max-w-lg px-5 pb-8 pt-5">
        <div className="mb-6 flex items-center justify-between text-[12px] font-bold">
          <span>{time}</span>
          <div className="flex items-center gap-2 text-[color:var(--shopper-text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-full border border-current" />
            <span className="h-2.5 w-4 rounded-sm border border-current" />
            <span className="h-2.5 w-6 rounded-sm border border-current" />
          </div>
        </div>

        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-[color:var(--shopper-text-secondary)]">Good morning</p>
            <h1 className="text-[24px] font-extrabold tracking-[-0.5px]">{firstName}</h1>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] ${activeSession ? "bg-primary/10 text-primary" : "bg-[color:var(--shopper-surface-2)] text-[color:var(--shopper-text-secondary)]"}`}>
              {activeSession ? <span className="pulse-dot h-2 w-2 rounded-full bg-primary" /> : <span className="h-2 w-2 rounded-full bg-[color:var(--shopper-text-muted)]" />}
              <span>{activeSession ? `Session active · ${activeSession.storeId}` : "No active session"}</span>
            </div>
          </div>
          <Button onClick={toggleTheme} variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-1)] text-[color:var(--shopper-text-primary)] hover:bg-[color:var(--shopper-surface-2)]">
            {theme === "dark" ? <Sun className="h-5 w-5 text-[#FFB800]" /> : <Moon className="h-5 w-5 text-[color:var(--shopper-text-primary)]" />}
          </Button>
        </header>

        <section className="relative overflow-hidden rounded-[18px] border border-[color:#1e2d45] bg-[linear-gradient(135deg,#0f2d3d_0%,#0a1628_100%)] p-4">
          <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[color:#7c3aed11]" />
          <div className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-[color:#00d4aa11]" />
          <p className="shopper-label relative z-10">Scan & Go</p>
          <h2 className="relative z-10 mt-2 whitespace-pre-line text-[18px] font-bold leading-[1.25] text-[color:#f0f4ff]">Skip the queue,{"\n"}shop at your pace</h2>
          <p className="relative z-10 mt-2 text-[13px] leading-6 text-[color:#8b95b0]">Start a session, scan items as you shop, and check out with UPI in seconds.</p>
          <Button onClick={() => router.push("/shopper/qr-start")} className="relative z-10 mt-5 h-12 w-full justify-center rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90">
            <QrCode className="h-4 w-4" /> Scan store QR
          </Button>
        </section>

        <section className="mt-5 shopper-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:#7c3aed18] text-[#a78bfa]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="shopper-label">Safety</p>
                <p className="text-[13px] font-bold">Dietary alerts</p>
              </div>
            </div>
            <Switch checked={alertsEnabled} disabled={updatingAlerts} onCheckedChange={toggleAlerts} />
          </div>
        </section>

        {alertsEnabled ? (
          <section className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(allergens.length ? allergens : ["gluten", "dairy", "nuts"]).map((allergen) => {
                const matched = allergens.includes(allergen);
                return (
                  <span
                    key={allergen}
                    className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[10px] font-bold ${matched ? "border-[#ff475744] bg-[#ff475718] text-[#ff4757]" : "border-primary/30 bg-primary/10 text-primary"}`}
                  >
                    {allergen}
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-bold">Recent trips</h3>
            <button className="text-[12px] font-bold text-primary">See all</button>
          </div>
          <div className="space-y-3">
            {recentSessions.length === 0 ? (
              <div className="shopper-card p-4 text-center text-[13px] text-[color:var(--shopper-text-secondary)]">No trips yet. Your completed sessions will appear here.</div>
            ) : (
              recentSessions.map((session) => {
                const createdAt = session.createdAt?.seconds ? session.createdAt.seconds * 1000 : undefined;
                return (
                  <div key={session.id} className="shopper-card flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--shopper-surface-2)] text-lg">🛍️</div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{session.storeId || "Catalyst Store"}</p>
                        <p className="text-[12px] text-[color:var(--shopper-text-secondary)]">
                          {timeAgo(createdAt)} · {session.itemCount || 0} items
                        </p>
                        {Number(session.savings || 0) > 0 ? (
                          <span className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">Saved {formatCurrency(Number(session.savings || 0))}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold">{formatCurrency(Number(session.totalAmount || 0))}</p>
                      <ChevronRight className="ml-auto mt-1 h-4 w-4 text-[color:var(--shopper-text-muted)]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
