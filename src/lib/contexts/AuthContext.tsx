"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export interface UserProfile {
  email: string;
  role: "admin" | "user";
  allergens: string[];
  allergenAlertsEnabled: boolean;
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

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      setUser(usr);

      if (!usr) {
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      unsubscribeProfile = onSnapshot(
        doc(db, "users", usr.uid),
        (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            const nextProfile: UserProfile = {
              email: data.email || usr.email || "",
              role: data.role === "admin" ? "admin" : "user",
              allergens: Array.isArray(data.allergens) ? data.allergens : [],
              allergenAlertsEnabled: data.allergenAlertsEnabled !== false,
            };
            setProfile(nextProfile);
            setRole(nextProfile.role);
          } else {
            const fallbackProfile: UserProfile = {
              email: usr.email || "",
              role: "user",
              allergens: [],
              allergenAlertsEnabled: true,
            };
            setProfile(fallbackProfile);
            setRole("user");
          }
          setLoading(false);
        },
        (e) => {
          console.error("Error fetching user profile", e);
          setProfile(null);
          setRole(null);
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
