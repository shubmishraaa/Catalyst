"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "flags"), orderBy("timestamp", "desc")), (snapshot) => {
      setFlags(snapshot.docs.map((flagDoc) => ({ id: flagDoc.id, ...flagDoc.data() })));
    });
    return () => unsub();
  }, []);

  const resolveFlag = async (id: string) => {
    await updateDoc(doc(db, "flags", id), { status: "resolved", resolved: true });
    toast({ title: "Flag resolved" });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#64748b]">Flags</p>
        <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.4px]">Security queue</h2>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {flags.length === 0 ? <div className="admin-card p-6 text-[12px] text-[color:#94a3b8]">No security flags raised.</div> : null}
        {flags.map((flag) => (
          <div key={flag.id} className="admin-card border-l-2 border-l-[#ff4757] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold">{flag.reason}</p>
                <p className="mt-1 text-[11px] text-[color:#94a3b8]">{flag.sessionId || "Session"} · {flag.timestamp?.seconds ? new Date(flag.timestamp.seconds * 1000).toLocaleString("en-IN") : "now"}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] ${flag.severity === "high" ? "bg-[#ff475714] text-[#ff4757]" : "bg-[#ffb80018] text-[#ffb800]"}`}>{flag.severity || "medium"}</span>
            </div>
            <button onClick={() => resolveFlag(flag.id)} className="mt-4 rounded-lg border border-[color:#e2e8f0] px-3 py-2 text-[11px] font-bold">Resolve</button>
          </div>
        ))}
      </div>
    </div>
  );
}
