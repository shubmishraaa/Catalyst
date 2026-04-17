"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "flags"), orderBy("timestamp", "desc")),
      (snapshot) => {
        setFlags(snapshot.docs.map((flagDoc) => ({ id: flagDoc.id, ...flagDoc.data() })));
      }
    );
    return () => unsub();
  }, []);

  const updateFlagStatus = async (id: string, status: "open" | "monitoring" | "resolved") => {
    try {
      await updateDoc(doc(db, "flags", id), { status });
      toast({ title: `Flag marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Flag update failed", description: err.message, variant: "destructive" });
    }
  };

  const badgeClassBySeverity: Record<string, string> = {
    low: "bg-yellow-500/10 text-yellow-600",
    medium: "bg-orange-500/10 text-orange-600",
    high: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h2 className="text-3xl font-bold">Security Flags</h2>
        <p className="text-muted-foreground">Monitor abnormal scanner activity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {flags.length === 0 && (
          <p className="col-span-full text-center p-8 text-muted-foreground">No security flags raised.</p>
        )}
        {flags.map((flag) => {
          const time = flag.timestamp?.seconds
            ? new Date(flag.timestamp.seconds * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : "Just now";

          const severity = flag.severity || "medium";
          const status = flag.status || "open";

          return (
            <Card key={flag.id} className="border-none shadow-sm bg-card border border-border border-l-4 border-l-destructive">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    {flag.reason}
                  </CardTitle>
                  <CardDescription>Session {flag.sessionId?.substring(0, 8)}... - {time}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={`shadow-none font-bold rounded-xl border-none ${badgeClassBySeverity[severity] || badgeClassBySeverity.medium}`}>
                    {severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="rounded-xl capitalize">
                    {status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex justify-end gap-2 text-sm pt-2">
                <Button variant="outline" size="sm" onClick={() => updateFlagStatus(flag.id, "monitoring")} className="rounded-xl shadow-sm">
                  Monitor Session
                </Button>
                <Button size="sm" variant="secondary" onClick={() => updateFlagStatus(flag.id, "resolved")} className="rounded-xl shadow-sm bg-muted text-foreground hover:bg-muted/80">
                  Resolve
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
