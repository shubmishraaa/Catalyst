"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { onSnapshot, serverTimestamp, doc, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

export interface SessionData {
  id: string;
  userId: string;
  storeId: string;
  status: "active" | "completed" | "abandoned";
  createdAt: any;
  expiresAt?: any;
  lastActivityAt?: any;
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

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistSession(session: SessionData | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession() {
  if (typeof window === "undefined") return null;

  const rawValue = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  if (rawValue.startsWith("{")) {
    try {
      return JSON.parse(rawValue) as SessionData;
    } catch {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      return null;
    }
  }

  return rawValue;
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number) {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
    }),
  ]);
}

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
  const syncingLocalSessionRef = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (!user) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setActiveSession(null);
        setLoadingSession(false);
        return;
      }

      setLoadingSession(true);
      const storedSession = readStoredSession();

      if (!storedSession) {
        setActiveSession(null);
        setLoadingSession(false);
        return;
      }

      if (typeof storedSession !== "string") {
        const expiresAtMs = resolveMillis(storedSession.expiresAt);
        if (
          storedSession.userId === user.uid &&
          storedSession.status === "active" &&
          (!expiresAtMs || Date.now() < expiresAtMs)
        ) {
          setActiveSession(storedSession);
          setLoadingSession(false);
          return;
        }

        persistSession(null);
        setActiveSession(null);
        setLoadingSession(false);
        return;
      }

      try {
        const sessionRef = doc(db, "sessions", storedSession);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          persistSession(null);
          setActiveSession(null);
          return;
        }

        const data = sessionSnap.data();
        if (data.userId !== user.uid || data.status !== "active") {
          persistSession(null);
          setActiveSession(null);
          return;
        }

        const expiresAtMs = resolveMillis(data.expiresAt);
        if (expiresAtMs && Date.now() >= expiresAtMs) {
          await setDoc(
            sessionRef,
            {
              status: "abandoned",
              completedAt: serverTimestamp(),
              endReason: "timeout",
              lastActivityAt: serverTimestamp(),
            },
            { merge: true }
          );
          persistSession(null);
          setActiveSession(null);
          return;
        }

        const restoredSession = {
          id: sessionSnap.id,
          ...(data as Omit<SessionData, "id">),
        };
        setActiveSession(restoredSession);
        persistSession(restoredSession);
      } catch (e) {
        console.error("Error restoring session", e);
        persistSession(null);
        setActiveSession(null);
      } finally {
        setLoadingSession(false);
      }
    };

    restoreSession();
  }, [user]);

  useEffect(() => {
    if (!user || !activeSession?.id) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "sessions", activeSession.id),
      (sessionDoc) => {
        if (!sessionDoc.exists()) {
          return;
        }

        const data = sessionDoc.data();
        if (data.userId !== user.uid) {
          return;
        }

        const nextSession: SessionData = {
          id: sessionDoc.id,
          ...(data as Omit<SessionData, "id">),
        };

        const expiresAtMs = resolveMillis(nextSession.expiresAt);
        if (nextSession.status !== "active" || (expiresAtMs && Date.now() >= expiresAtMs)) {
          persistSession(null);
          setActiveSession(null);
          return;
        }

        setActiveSession(nextSession);
        persistSession(nextSession);
      },
      (error) => {
        console.warn("Error subscribing to active session", error);
      }
    );

    return () => unsubscribe();
  }, [activeSession?.id, user]);

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

  useEffect(() => {
    if (!user || !activeSession || syncingLocalSessionRef.current) {
      return;
    }

    let cancelled = false;

    const syncSession = async () => {
      syncingLocalSessionRef.current = true;

      try {
        const createdAtMs = resolveMillis(activeSession.createdAt) ?? Date.now();
        const expiresAtMs = resolveMillis(activeSession.expiresAt) ?? createdAtMs + MAX_SESSION_DURATION_MS;
        await setDoc(doc(db, "sessions", activeSession.id), {
          userId: activeSession.userId,
          storeId: activeSession.storeId,
          status: activeSession.status,
          createdAt: Timestamp.fromMillis(createdAtMs),
          expiresAt: Timestamp.fromMillis(expiresAtMs),
          lastActivityAt: serverTimestamp(),
        });

        if (cancelled) {
          return;
        }
        persistSession(activeSession);
      } catch (error) {
        if (!cancelled) {
          console.warn("Retrying local session sync", error);
        }
      } finally {
        syncingLocalSessionRef.current = false;
      }
    };

    void syncSession();
    const retryTimer = setInterval(() => {
      if (!syncingLocalSessionRef.current) {
        void syncSession();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(retryTimer);
    };
  }, [activeSession, user]);

  useEffect(() => {
    if (!user || !activeSession) {
      return;
    }

    const heartbeat = async () => {
      const createdAtMs = resolveMillis(activeSession.createdAt) ?? Date.now();
      const expiresAtMs = resolveMillis(activeSession.expiresAt) ?? createdAtMs + MAX_SESSION_DURATION_MS;

      try {
        await setDoc(
          doc(db, "sessions", activeSession.id),
          {
            userId: activeSession.userId,
            storeId: activeSession.storeId,
            status: activeSession.status,
            createdAt: Timestamp.fromMillis(createdAtMs),
            expiresAt: Timestamp.fromMillis(expiresAtMs),
            lastActivityAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn("Could not heartbeat session state", error);
      }
    };

    void heartbeat();
    const heartbeatInterval = setInterval(() => {
      void heartbeat();
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [activeSession, user]);

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
          persistSession(activeSession);
          return activeSession.id;
        }

        void setDoc(
          doc(db, "sessions", activeSession.id),
          {
            status: "abandoned",
            completedAt: serverTimestamp(),
            endReason: "switch_store",
            lastActivityAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((error) => {
          console.warn("Could not sync previous session end", error);
        });
      }

      const now = Date.now();
      const optimisticSession: SessionData = {
        id: createSessionId(),
        userId: user.uid,
        storeId: normalizedStoreId,
        status: "active",
        createdAt: { seconds: Math.floor(now / 1000) },
        expiresAt: { seconds: Math.floor((now + MAX_SESSION_DURATION_MS) / 1000) },
        lastActivityAt: { seconds: Math.floor(now / 1000) },
      };

      setActiveSession(optimisticSession);
      setElapsedTime("00:00");
      setRemainingTime("01:30:00");
      persistSession(optimisticSession);

      void setDoc(doc(db, "sessions", optimisticSession.id), {
        userId: user.uid,
        storeId: normalizedStoreId,
        status: "active",
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + MAX_SESSION_DURATION_MS),
        lastActivityAt: serverTimestamp(),
      })
        .then(() => {
          setActiveSession((current) => {
            if (!current || current.id !== optimisticSession.id) {
              return current;
            }
            persistSession(optimisticSession);
            return optimisticSession;
          });
        })
        .catch((error) => {
          console.warn("Session sync is still pending or unavailable", error);
        });

      return optimisticSession.id;
    } finally {
      setSessionBusy(false);
    }
  };

  const endSession = async (completion?: CompleteSessionInput) => {
    if (!activeSession?.id) return;

    setSessionBusy(true);
    try {
      await withTimeout(
        setDoc(
          doc(db, "sessions", activeSession.id),
          {
            status: completion?.status ?? "completed",
            completedAt: serverTimestamp(),
            totalAmount: completion?.totalAmount ?? 0,
            transactionId: completion?.transactionId ?? null,
            auditStatus: completion?.auditStatus ?? "not_required",
            endReason: completion?.endReason ?? "checkout",
            lastActivityAt: serverTimestamp(),
          },
          { merge: true }
        ),
        8000
      );
    } finally {
      persistSession(null);
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
