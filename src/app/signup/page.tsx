"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) return;

    if (role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    router.replace("/shopper/home");
  }, [loading, role, router, user]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const normalizedName = fullName.trim();
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedName) {
        throw new Error("Full name is required");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const assignedRole = normalizedEmail === "admin@catalyst.com" ? "admin" : "user";

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: normalizedEmail,
        name: normalizedName,
        role: assignedRole,
        allergens: [],
        allergenAlertsEnabled: true,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      toast({ title: "Signup Failed", description: err.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm rounded-[2rem] border-none shadow-sm bg-card border border-border">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Catalyst to checkout effortlessly.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-14 rounded-xl border-border bg-muted/20"
            />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-14 rounded-xl border-border bg-muted/20"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-14 rounded-xl border-border bg-muted/20"
              minLength={6}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold text-lg mt-4 shadow-xl shadow-primary/20">
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Sign Up"}
            </Button>
          </form>
          <p className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Shopper accounts are created here by default. The reserved demo admin account is
            <span className="font-semibold text-foreground"> admin@catalyst.com</span>.
          </p>
          <p className="text-center mt-6 text-muted-foreground text-sm">
            Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
