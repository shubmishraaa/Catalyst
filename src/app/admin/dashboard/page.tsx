"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, IndianRupee, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

export default function AdminDashboardPage() {
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [flagsCount, setFlagsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [cartSummaries, setCartSummaries] = useState<Record<string, CartSummary>>({});

  useEffect(() => {
    const unsubSessions = onSnapshot(
      collection(db, "sessions"),
      (snap) => {
        const nextSessions = snap.docs
          .map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() } as SessionRecord))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setSessions(nextSessions.slice(0, 6));
        setActiveSessionsCount(nextSessions.filter((session) => session.status === "active").length);
      }
    );

    const unsubFlags = onSnapshot(
      query(collection(db, "flags"), where("status", "!=", "resolved")),
      (snap) => setFlagsCount(snap.size)
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

    return () => {
      unsubSessions();
      unsubFlags();
      unsubTxns();
      unsubCartItems();
    };
  }, []);

  const stats = [
    { label: "Active Sessions", value: activeSessionsCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Revenue Recorded", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-accent", bg: "bg-accent/10" },
    { label: "Security Flags", value: flagsCount, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Store Status", value: "Online", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  const formatTime = (seconds?: number) =>
    seconds ? new Date(seconds * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now";

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h2 className="text-3xl font-bold">Store Overview</h2>
        <p className="text-muted-foreground">Live operations for Catalyst Retail Group</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-card border border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.2fr_0.8fr] gap-8 items-start">
        <Card className="border-none shadow-sm overflow-hidden bg-card border border-border">
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
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No sessions yet.</TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => {
                  const cartSummary = cartSummaries[session.id];
                  const itemCount = cartSummary?.itemCount || 0;
                  const liveTotal = cartSummary?.totalAmount || 0;
                  const displayTotal = session.status === "active"
                    ? liveTotal
                    : Number(session.totalAmount || 0);

                  return (
                    <TableRow key={session.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{session.storeId || "Unknown store"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{session.userId?.slice(0, 10) || "Unknown"}...</TableCell>
                      <TableCell>{itemCount}</TableCell>
                      <TableCell>{formatTime(session.createdAt?.seconds)}</TableCell>
                      <TableCell>Rs. {displayTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            session.status === "active"
                              ? "bg-green-500/10 text-green-600 rounded-full border-none shadow-none font-bold"
                              : "bg-muted text-foreground rounded-full border-none shadow-none font-bold"
                          }
                        >
                          {session.status || "unknown"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-card border border-border">
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
                      <Badge
                        className={
                          txn.status === "success"
                            ? "bg-green-500/10 text-green-600 rounded-full border-none shadow-none font-bold"
                            : txn.status === "failed"
                              ? "bg-destructive/10 text-destructive rounded-full border-none shadow-none font-bold"
                              : "bg-yellow-500/10 text-yellow-600 rounded-full border-none shadow-none font-bold"
                        }
                      >
                        {txn.status || "pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-8 text-center bg-card shadow-sm border border-border">
          <CardHeader>
            <CardTitle>Catalyst Express</CardTitle>
            <CardDescription>Shopper QR Check-in Gateway</CardDescription>
          </CardHeader>
          <div className="flex justify-center p-8 bg-white max-w-xs mx-auto rounded-[2rem] shadow-xl">
            <QRCodeSVG value="catalyst-express-01" size={200} level={"H"} />
          </div>
          <p className="mt-8 font-mono text-muted-foreground">Store ID: catalyst-express-01</p>
        </Card>
      </div>
    </div>
  );
}
