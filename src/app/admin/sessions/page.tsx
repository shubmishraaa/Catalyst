"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "sessions"), where("status", "==", "active")), 
      (snapshot) => {
        setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h2 className="text-3xl font-bold">Active Sessions</h2>
        <p className="text-muted-foreground">Monitor shoppers currently in the store.</p>
      </header>

      <Card className="border-none shadow-sm overflow-hidden bg-card border border-border">
        <Table>
          <TableHeader className="bg-muted/50 border-b-border">
            <TableRow>
              <TableHead>Session ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No active sessions right now.</TableCell>
              </TableRow>
            )}
            {sessions.map((session) => {
              const dateOptions: any = { hour: '2-digit', minute:'2-digit' };
              const time = session.createdAt?.seconds ? new Date(session.createdAt.seconds * 1000).toLocaleTimeString(undefined, dateOptions) : "Just now";
              
              return (
                <TableRow key={session.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-medium text-xs">{session.id}</TableCell>
                  <TableCell className="text-xs">{session.userId}</TableCell>
                  <TableCell>{session.storeId}</TableCell>
                  <TableCell>{time}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-500/10 text-green-500 rounded-full border-none shadow-none font-bold hover:bg-green-500/20">
                      Active
                    </Badge>
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
