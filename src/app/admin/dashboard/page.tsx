"use client";

import { useState, useEffect } from "react";
import { Users, AlertCircle, IndianRupee, Lock, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/utils";

interface SessionRecord {
  id: string;
  userId?: string;
  storeId?: string;
  status?: "active" | "completed" | "abandoned";
  totalAmount?: number;
  createdAt?: { seconds?: number };
  expiresAt?: { seconds?: number };
  lastActivityAt?: { seconds?: number };
}

interface TransactionRecord {
  id: string;
  amount?: number;
  status?: "pending" | "success" | "failed";
}

interface UserRecord {
  name?: string;
  isOnline?: boolean;
  lastSeenAt?: { seconds?: number };
}

export default function AdminDashboardPage() {
  const [now, setNow] = useState(Date.now());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserRecord>>({});
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, "sessions"), (snap) => setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionRecord))));
    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TransactionRecord))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => setUsersById(snap.docs.reduce<Record<string, UserRecord>>((acc, userDoc) => {
      acc[userDoc.id] = userDoc.data() as UserRecord;
      return acc;
    }, {})));
    const unsubFlags = onSnapshot(collection(db, "flags"), (snap) => setFlags(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const timer = setInterval(() => setNow(Date.now()), 15000);

    return () => {
      unsubSessions();
      unsubTransactions();
      unsubUsers();
      unsubFlags();
      clearInterval(timer);
    };
  }, []);

  const activeSessions = sessions.filter((session) => session.status === "active");
  const activeUsers = Object.values(usersById).filter((user) => user.isOnline).length;
  const revenue = transactions.reduce((sum, txn) => txn.status === "success" ? sum + Number(txn.amount || 0) : sum, 0);
  const unresolvedFlags = flags.filter((flag) => flag.status !== "resolved");

  const stats = [
    { label: "Active Users", value: activeUsers, icon: Users, tone: "bg-primary/10 text-primary", meta: "+2" },
    { label: "Active Sessions", value: activeSessions.length, icon: Lock, tone: "bg-[color:#7c3aed18] text-[#7c3aed]", meta: "Live" },
    { label: "Revenue Today", value: formatCurrency(revenue), icon: Star, tone: "bg-[#ffb80018] text-[#ffb800]", meta: "Today" },
    { label: "Security Flags", value: unresolvedFlags.length, icon: AlertCircle, tone: "bg-[#ff475714] text-[#ff4757]", meta: "Watch" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#64748b]">Welcome back</p>
        <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.4px] text-[color:var(--admin-text)]">Store overview</h2>
        <p className="mt-1 text-[13px] text-[color:#94a3b8]">Live snapshot · {new Date(now).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card p-4">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-[color:#64748b]">{stat.meta}</span>
            </div>
            <p className="mt-4 text-[20px] font-extrabold text-[color:var(--admin-text)]">{stat.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:#94a3b8]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:#f1f5f9] p-4">
              <div>
                <h3 className="text-[13px] font-bold">Live sessions</h3>
                <p className="text-[12px] text-[color:#94a3b8]">Active and flagged shoppers right now</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" /> Live
              </span>
            </div>
            <div>
              {activeSessions.slice(0, 6).map((session) => (
                <div key={session.id} className="flex items-center justify-between border-b border-[color:#f1f5f9] px-4 py-3 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:#dbeafe] text-[11px] font-bold text-[color:#0f172a]">
                      {(usersById[session.userId || ""]?.name || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold">{usersById[session.userId || ""]?.name || "Unknown shopper"}</p>
                      <p className="text-[10px] text-[color:#94a3b8]">{session.storeId || "Store"} · active</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] text-primary">Active</span>
                </div>
              ))}
              {activeSessions.length === 0 ? <div className="p-6 text-[12px] text-[color:#94a3b8]">No live sessions right now.</div> : null}
            </div>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-[color:#f1f5f9] p-4">
              <h3 className="text-[13px] font-bold">Flags</h3>
            </div>
            <div>
              {unresolvedFlags.slice(0, 5).map((flag) => (
                <div key={flag.id} className="flex items-center justify-between gap-3 border-b border-[color:#f1f5f9] px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold">{flag.reason || "Unusual activity"}</p>
                    <p className="text-[10px] text-[color:#94a3b8]">{flag.severity || "medium"} · {flag.timestamp?.seconds ? new Date(flag.timestamp.seconds * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "now"}</p>
                  </div>
                  <button
                    onClick={() => updateDoc(doc(db, "flags", flag.id), { resolved: true, status: "resolved" })}
                    className="rounded-lg border border-[color:#e2e8f0] px-3 py-2 text-[11px] font-bold text-[color:#0f172a]"
                  >
                    Resolve
                  </button>
                </div>
              ))}
              {unresolvedFlags.length === 0 ? <div className="p-6 text-[12px] text-[color:#94a3b8]">No unresolved flags.</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[14px] border border-[color:#1e2d45] bg-[#0f172a] p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Store check-in QR</p>
            <div className="mt-4 rounded-xl bg-white p-4">
              <QRCodeSVG value="catalyst-express-01" size={180} className="mx-auto" />
            </div>
            <p className="mt-4 text-[12px] text-[color:#8b95b0]">Catalyst Express</p>
            <p className="mt-1 font-mono text-[10px] text-[color:#4a5568]">catalyst-express-01</p>
          </div>
        </div>
      </div>
    </div>
  );
}
