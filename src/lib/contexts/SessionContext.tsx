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
  expiresAt?: any;
  totalAmount?: number;
  transactionId?: string;
  auditStatus?: "not_required" | "pending" | "completed";
}

interface CompleteSessionInput {
  status?: "completed" | "abandoned";
  totalAmount?: number;
  transactionId?: string;
  auditStatus?: "not_required" | "pending" | "completed";
  endReason?: "manual" | "checkout" | "timeout" | "switch_store";
}

interface SessionContextType {
  activeSession: SessionData | null;
  loadingSession: boolean;
  sessionBusy: boolean;
  startSession: (storeId: string) => Promise<string>;
  endSession: (completion?: CompleteSessionInput) => Promise<void>;
  elapsedTime: string;
  remainingTime: string;
}

const ACTIVE_SESSION_STORAGE_KEY = "catalyst-active-session-id";
const MAX_SESSION_DURATION_MS = 90 * 60 * 1000;

function resolveMillis(value: any) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return null;
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const SessionContext = createContext<SessionContextType>({
  activeSession: null,
  loadingSession: true,
  sessionBusy: false,
  startSession: async () => "",
  endSession: async () => {},
  elapsedTime: "00:00",
  remainingTime: "01:30:00",
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [remainingTime, setRemainingTime] = useState("01:30:00");

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

        const expiresAtMs = resolveMillis(data.expiresAt);
        if (expiresAtMs && Date.now() >= expiresAtMs) {
          await updateDoc(sessionRef, {
            status: "abandoned",
            completedAt: serverTimestamp(),
            endReason: "timeout",
          });
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
    if (!activeSession?.createdAt) {
      setElapsedTime("00:00");
      setRemainingTime("01:30:00");
      return;
    }

    let timeoutTriggered = false;

    const interval = setInterval(() => {
      const start = resolveMillis(activeSession.createdAt) ?? Date.now();
      const expiry = resolveMillis(activeSession.expiresAt) ?? start + MAX_SESSION_DURATION_MS;

      const diff = Math.floor((Date.now() - start) / 1000);
      const remainingSeconds = Math.max(0, Math.floor((expiry - Date.now()) / 1000));

      if (diff >= 0) {
        setElapsedTime(formatDuration(diff));
      }

      setRemainingTime(formatDuration(remainingSeconds));

      if (!timeoutTriggered && Date.now() >= expiry) {
        timeoutTriggered = true;
        void endSession({ status: "abandoned", endReason: "timeout" });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const startSession = async (storeId: string) => {
    if (!user) throw new Error("Must be logged in");

    const normalizedStoreId = storeId.trim();
    if (!normalizedStoreId) {
      throw new Error("Store ID is required");
    }

    setSessionBusy(true);
    try {
      if (activeSession?.status === "active") {
        if (activeSession.storeId === normalizedStoreId) {
          localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSession.id);
          return activeSession.id;
        }

        await updateDoc(doc(db, "sessions", activeSession.id), {
          status: "abandoned",
          completedAt: serverTimestamp(),
          endReason: "switch_store",
        });
      }

      const now = Date.now();
      const docRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        storeId: normalizedStoreId,
        status: "active",
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + MAX_SESSION_DURATION_MS),
      });

      const newSession: SessionData = {
        id: docRef.id,
        userId: user.uid,
        storeId: normalizedStoreId,
        status: "active",
        createdAt: { seconds: Math.floor(now / 1000) },
        expiresAt: { seconds: Math.floor((now + MAX_SESSION_DURATION_MS) / 1000) },
      };

      setActiveSession(newSession);
      setElapsedTime("00:00");
      setRemainingTime("01:30:00");
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, docRef.id);
      return docRef.id;
    } finally {
      setSessionBusy(false);
    }
  };

  const endSession = async (completion?: CompleteSessionInput) => {
    if (!activeSession?.id) return;

    setSessionBusy(true);
    try {
      await updateDoc(doc(db, "sessions", activeSession.id), {
        status: completion?.status ?? "completed",
        completedAt: serverTimestamp(),
        totalAmount: completion?.totalAmount ?? 0,
        transactionId: completion?.transactionId ?? null,
        auditStatus: completion?.auditStatus ?? "not_required",
        endReason: completion?.endReason ?? "checkout",
      });
    } finally {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      setActiveSession(null);
      setSessionBusy(false);
    }
  };

  return (
    <SessionContext.Provider value={{ activeSession, loadingSession, sessionBusy, startSession, endSession, elapsedTime, remainingTime }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
