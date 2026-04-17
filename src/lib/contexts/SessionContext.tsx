"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

export interface SessionData {
  id: string;
  userId: string;
  storeId: string;
  status: "active" | "completed" | "abandoned";
  createdAt: any;
  totalAmount?: number;
  transactionId?: string;
  auditStatus?: "not_required" | "pending" | "completed";
}

interface CompleteSessionInput {
  totalAmount?: number;
  transactionId?: string;
  auditStatus?: "not_required" | "pending" | "completed";
}

interface SessionContextType {
  activeSession: SessionData | null;
  loadingSession: boolean;
  startSession: (storeId: string) => Promise<string>;
  endSession: (completion?: CompleteSessionInput) => Promise<void>;
  elapsedTime: string;
}

const ACTIVE_SESSION_STORAGE_KEY = "catalyst-active-session-id";

const SessionContext = createContext<SessionContextType>({
  activeSession: null,
  loadingSession: true,
  startSession: async () => "",
  endSession: async () => {},
  elapsedTime: "00:00",
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00");

  useEffect(() => {
    const restoreSession = async () => {
      if (!user) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setActiveSession(null);
        setLoadingSession(false);
        return;
      }

      setLoadingSession(true);
      const storedSessionId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

      if (!storedSessionId) {
        setActiveSession(null);
        setLoadingSession(false);
        return;
      }

      try {
        const sessionRef = doc(db, "sessions", storedSessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          setActiveSession(null);
          return;
        }

        const data = sessionSnap.data();
        if (data.userId !== user.uid || data.status !== "active") {
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          setActiveSession(null);
          return;
        }

        setActiveSession({
          id: sessionSnap.id,
          ...(data as Omit<SessionData, "id">),
        });
      } catch (e) {
        console.error("Error restoring session", e);
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setActiveSession(null);
      } finally {
        setLoadingSession(false);
      }
    };

    restoreSession();
  }, [user]);

  useEffect(() => {
    if (!activeSession?.createdAt) return;

    const interval = setInterval(() => {
      let start: number;
      if (activeSession.createdAt instanceof Timestamp) {
        start = activeSession.createdAt.toMillis();
      } else if (activeSession.createdAt.seconds) {
        start = activeSession.createdAt.seconds * 1000;
      } else {
        start = Date.now();
      }

      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 0) return;
      const minutes = Math.floor(diff / 60).toString().padStart(2, "0");
      const seconds = (diff % 60).toString().padStart(2, "0");
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const startSession = async (storeId: string) => {
    if (!user) throw new Error("Must be logged in");

    const normalizedStoreId = storeId.trim();
    if (!normalizedStoreId) {
      throw new Error("Store ID is required");
    }

    if (activeSession?.status === "active") {
      if (activeSession.storeId === normalizedStoreId) {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSession.id);
        return activeSession.id;
      }

      await updateDoc(doc(db, "sessions", activeSession.id), {
        status: "abandoned",
      });
    }

    const docRef = await addDoc(collection(db, "sessions"), {
      userId: user.uid,
      storeId: normalizedStoreId,
      status: "active",
      createdAt: serverTimestamp(),
    });

    const newSession: SessionData = {
      id: docRef.id,
      userId: user.uid,
      storeId: normalizedStoreId,
      status: "active",
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };

    setActiveSession(newSession);
    setElapsedTime("00:00");
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, docRef.id);
    return docRef.id;
  };

  const endSession = async (completion?: CompleteSessionInput) => {
    if (!activeSession?.id) return;

    await updateDoc(doc(db, "sessions", activeSession.id), {
      status: "completed",
      completedAt: serverTimestamp(),
      totalAmount: completion?.totalAmount ?? 0,
      transactionId: completion?.transactionId ?? null,
      auditStatus: completion?.auditStatus ?? "not_required",
    });

    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    setActiveSession(null);
  };

  return (
    <SessionContext.Provider value={{ activeSession, loadingSession, startSession, endSession, elapsedTime }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
