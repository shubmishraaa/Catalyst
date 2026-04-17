"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function AdminAuditsPage() {
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "transactions"), where("status", "in", ["success", "failed"])), 
      (snapshot) => {
        setTxns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h2 className="text-3xl font-bold">Audit History</h2>
        <p className="text-muted-foreground">Historical ledger of all completed checkout sequences.</p>
      </header>

      <Card className="border-none shadow-sm overflow-hidden bg-card border border-border">
        <Table>
          <TableHeader className="bg-muted/50 border-b-border">
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No audits available.</TableCell>
              </TableRow>
            )}
            {txns.map((txn) => {
              const dateOptions: any = { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
              const time = txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000).toLocaleDateString(undefined, dateOptions) : "Just now";
              
              return (
                <TableRow key={txn.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-medium text-xs">{txn.id}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{txn.sessionId}</TableCell>
                  <TableCell className="font-bold">₹{txn.amount}</TableCell>
                  <TableCell>{time}</TableCell>
                  <TableCell>
                    {txn.status === "success" ? (
                      <Badge className="bg-green-500/10 text-green-500 rounded-full border-none shadow-none font-bold hover:bg-green-500/20">Success</Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive rounded-full border-none shadow-none font-bold hover:bg-destructive/20">Failed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
