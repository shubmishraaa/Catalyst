"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface UserRecord {
  name?: string;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserRecord>>({});

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "sessions"), where("status", "==", "active")), (snapshot) => {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      setSessions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((session: any) => !session.expiresAt?.seconds || session.expiresAt.seconds > currentTimeSeconds));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsersById(snapshot.docs.reduce<Record<string, UserRecord>>((acc, userDoc) => {
        acc[userDoc.id] = userDoc.data() as UserRecord;
        return acc;
      }, {}));
    });
    return () => {
      unsub();
      unsubUsers();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#64748b]">Sessions</p>
        <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.4px]">Live sessions</h2>
      </header>
      <div className="admin-card overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b border-[color:#f1f5f9] bg-[color:#f8fafc] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:#94a3b8]">
          <span>Session</span><span>User</span><span>Store</span><span>Started</span><span>Status</span>
        </div>
        {sessions.length === 0 ? <div className="p-6 text-[12px] text-[color:#94a3b8]">No active sessions right now.</div> : null}
        {sessions.map((session) => (
          <div key={session.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b border-[color:#f1f5f9] px-4 py-3 text-[12px] last:border-b-0">
            <span className="truncate font-mono">{session.id}</span>
            <span>{usersById[session.userId]?.name || "Unknown"}</span>
            <span>{session.storeId}</span>
            <span>{session.createdAt?.seconds ? new Date(session.createdAt.seconds * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Now"}</span>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] text-primary">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}
