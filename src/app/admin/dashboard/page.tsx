"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, AlertCircle, IndianRupee, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";

interface SessionRecord {
  id: string;
  userId?: string;
  storeId?: string;
  status?: "active" | "completed" | "abandoned";
  totalAmount?: number;
  createdAt?: { seconds?: number };
}

interface TransactionRecord {
  id: string;
  sessionId?: string;
  amount?: number;
  status?: "pending" | "success" | "failed";
  txnRef?: string;
  createdAt?: { seconds?: number };
}

interface CartSummary {
  itemCount: number;
  totalAmount: number;
}

interface UserRecord {
  name?: string;
  email?: string;
}

export default function AdminDashboardPage() {
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [flagsCount, setFlagsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalUsersToday, setTotalUsersToday] = useState(0);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [cartSummaries, setCartSummaries] = useState<Record<string, CartSummary>>({});
  const [usersById, setUsersById] = useState<Record<string, UserRecord>>({});
  const [flaggedSessionIds, setFlaggedSessionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubSessions = onSnapshot(
      collection(db, "sessions"),
      (snap) => {
        const nextSessions = snap.docs
          .map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() } as SessionRecord))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodaySeconds = Math.floor(startOfToday.getTime() / 1000);
        const usersSeenToday = new Set(
          nextSessions
            .filter((session) => (session.createdAt?.seconds || 0) >= startOfTodaySeconds)
            .map((session) => session.userId)
            .filter(Boolean)
        );

        setSessions(nextSessions.slice(0, 6));
        setActiveSessionsCount(nextSessions.filter((session) => session.status === "active").length);
        setTotalUsersToday(usersSeenToday.size);
      }
    );

    const unsubFlags = onSnapshot(
      collection(db, "flags"),
      (snap) => {
        const nextFlaggedSessions = snap.docs.reduce<Record<string, boolean>>((acc, flagDoc) => {
          const data = flagDoc.data() as { sessionId?: string; status?: string };
          if (data.sessionId && data.status !== "resolved") {
            acc[data.sessionId] = true;
          }
          return acc;
        }, {});

        setFlagsCount(snap.size);
        setFlaggedSessionIds(nextFlaggedSessions);
      }
    );

    const unsubTxns = onSnapshot(
      collection(db, "transactions"),
      (snap) => {
        const nextTransactions = snap.docs
          .map((txnDoc) => ({ id: txnDoc.id, ...txnDoc.data() } as TransactionRecord))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setTransactions(nextTransactions.slice(0, 6));
        const revenue = nextTransactions.reduce((acc, txn) => (
          txn.status === "success" ? acc + (Number(txn.amount) || 0) : acc
        ), 0);
        setTotalRevenue(revenue);
      }
    );

    const unsubCartItems = onSnapshot(
      collection(db, "cartItems"),
      (snap) => {
        const nextCartSummaries = snap.docs.reduce<Record<string, CartSummary>>((acc, cartItemDoc) => {
          const data = cartItemDoc.data() as {
            sessionId?: string;
            quantity?: number;
            price?: number;
          };

          if (!data.sessionId) {
            return acc;
          }

          const quantity = Number(data.quantity) || 0;
          const price = Number(data.price) || 0;
          const existing = acc[data.sessionId] || { itemCount: 0, totalAmount: 0 };

          acc[data.sessionId] = {
            itemCount: existing.itemCount + quantity,
            totalAmount: existing.totalAmount + (quantity * price),
          };

          return acc;
        }, {});

        setCartSummaries(nextCartSummaries);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const nextUsers = snap.docs.reduce<Record<string, UserRecord>>((acc, userDoc) => {
          acc[userDoc.id] = userDoc.data() as UserRecord;
          return acc;
        }, {});

        setUsersById(nextUsers);
      }
    );

    return () => {
      unsubSessions();
      unsubFlags();
      unsubTxns();
      unsubCartItems();
      unsubUsers();
    };
  }, []);

  const stats = [
    { label: "Active Sessions", value: activeSessionsCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-accent", bg: "bg-accent/10" },
    { label: "Security Flags", value: flagsCount, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Total Users Today", value: totalUsersToday, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10" },
  ];

  const formatTime = (seconds?: number) =>
    seconds ? new Date(seconds * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now";

  const getSessionStatus = (session: SessionRecord) => {
    if (flaggedSessionIds[session.id]) {
      return {
        label: "flagged",
        className: "bg-red-50 text-red-700",
      };
    }

    if (session.status === "completed") {
      return {
        label: "completed",
        className: "bg-blue-50 text-blue-700",
      };
    }

    return {
      label: "active",
      className: "bg-green-50 text-green-700",
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Welcome back, Admin</p>
        <h2 className="text-3xl font-bold">Store Overview</h2>
        <p className="text-muted-foreground">Live operations for Catalyst Retail Group</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-xl border border-border bg-card shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`${stat.bg} ${stat.color} rounded-xl p-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1.1fr_0.75fr]">
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest active and completed shopper sessions.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/50 border-b-border">
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="text-base font-medium text-foreground">No active sessions right now</p>
                      <p className="mt-1 text-sm text-muted-foreground">New shopper sessions will appear here once they start.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => {
                  const cartSummary = cartSummaries[session.id];
                  const itemCount = cartSummary?.itemCount || 0;
                  const liveTotal = cartSummary?.totalAmount || 0;
                  const displayTotal = session.status === "active"
                    ? liveTotal
                    : Number(session.totalAmount || 0);
                  const shopperName = session.userId ? usersById[session.userId]?.name : null;
                  const status = getSessionStatus(session);

                  return (
                    <TableRow key={session.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{session.storeId || "Unknown store"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{shopperName || "Unknown shopper"}</TableCell>
                      <TableCell>{itemCount}</TableCell>
                      <TableCell>{formatTime(session.createdAt?.seconds)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTime(session.createdAt?.seconds)}</TableCell>
                      <TableCell>Rs. {displayTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${status.className}`}>
                          {status.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest checkout activity across the store.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/50 border-b-border">
              <TableRow>
                <TableHead>Txn Ref</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No transactions yet.</TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-medium">{txn.txnRef || txn.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{txn.sessionId?.slice(0, 10) || "Unknown"}...</TableCell>
                    <TableCell className="font-medium">Rs. {Number(txn.amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{formatTime(txn.createdAt?.seconds)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          txn.status === "success"
                            ? "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                            : txn.status === "failed"
                              ? "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                              : "inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700"
                        }
                      >
                        {txn.status || "pending"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="border border-border bg-card p-6 text-center shadow-none rounded-xl">
          <CardHeader>
            <CardTitle>Catalyst Express</CardTitle>
            <CardDescription>Shopper QR Check-in Gateway</CardDescription>
          </CardHeader>
          <div className="mx-auto flex max-w-xs justify-center rounded-xl bg-white p-6">
            <QRCodeSVG value="catalyst-express-01" size={200} level={"H"} />
          </div>
          <p className="mt-6 font-mono text-sm text-muted-foreground">Store ID: catalyst-express-01</p>
        </Card>
      </div>
    </div>
  );
}
