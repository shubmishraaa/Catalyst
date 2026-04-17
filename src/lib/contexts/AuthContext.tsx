"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

export interface UserProfile {
  email: string;
  name: string;
  role: "admin" | "user";
  allergens: string[];
  allergenAlertsEnabled: boolean;
  isOnline?: boolean;
  lastSeenAt?: unknown;
}

const ADMIN_EMAIL = "admin@catalyst.com";

function buildFallbackProfile(usr: FirebaseUser): UserProfile {
  const normalizedEmail = usr.email?.trim().toLowerCase() || "";

  return {
    email: normalizedEmail,
    name: usr.displayName?.trim() || "Shopper",
    role: normalizedEmail === ADMIN_EMAIL ? "admin" : "user",
    allergens: [],
    allergenAlertsEnabled: true,
  };
}

interface AuthContextType {
  user: FirebaseUser | null;
  role: "admin" | "user" | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserRef = useRef<FirebaseUser | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      setUser(usr);

      if (!usr) {
        if (previousUserRef.current) {
          void setDoc(
            doc(db, "users", previousUserRef.current.uid),
            {
              isOnline: false,
              lastSeenAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((error) => {
            console.warn("Could not update user offline presence", error);
          });
        }

        previousUserRef.current = null;
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      previousUserRef.current = usr;
      setLoading(true);
      const fallbackProfile = buildFallbackProfile(usr);

      void setDoc(
        doc(db, "users", usr.uid),
        {
          email: fallbackProfile.email,
          name: fallbackProfile.name,
          role: fallbackProfile.role,
          isOnline: true,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((error) => {
        console.warn("Could not update user online presence", error);
      });

      unsubscribeProfile = onSnapshot(
        doc(db, "users", usr.uid),
        (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            const nextProfile: UserProfile = {
              email: data.email || fallbackProfile.email,
              name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallbackProfile.name,
              role: data.role === "admin" || fallbackProfile.role === "admin" ? "admin" : "user",
              allergens: Array.isArray(data.allergens) ? data.allergens : [],
              allergenAlertsEnabled: data.allergenAlertsEnabled !== false,
              isOnline: data.isOnline === true,
              lastSeenAt: data.lastSeenAt,
            };
            setProfile(nextProfile);
            setRole(nextProfile.role);
          } else {
            setProfile(fallbackProfile);
            setRole(fallbackProfile.role);
          }
          setLoading(false);
        },
        (e) => {
          console.error("Error fetching user profile", e);
          const fallbackProfile = buildFallbackProfile(usr);
          setProfile(fallbackProfile);
          setRole(fallbackProfile.role);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
