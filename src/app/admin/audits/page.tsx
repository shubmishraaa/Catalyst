"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";

export default function AdminAuditsPage() {
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "transactions"), where("status", "in", ["success", "failed"])), (snapshot) => {
      setTxns(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#64748b]">Audits</p>
        <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.4px]">Audit history</h2>
      </header>
      <div className="admin-card overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 border-b border-[color:#f1f5f9] bg-[color:#f8fafc] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:#94a3b8]">
          <span>Transaction</span><span>Session</span><span>Amount</span><span>Status</span>
        </div>
        {txns.map((txn) => (
          <div key={txn.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 border-b border-[color:#f1f5f9] px-4 py-3 text-[12px] last:border-b-0">
            <span className="truncate font-mono">{txn.id}</span>
            <span className="truncate">{txn.sessionId}</span>
            <span>{formatCurrency(Number(txn.amount || 0))}</span>
            <span className={`w-fit rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] ${txn.status === "success" ? "bg-primary/10 text-primary" : "bg-[#ff475714] text-[#ff4757]"}`}>{txn.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
