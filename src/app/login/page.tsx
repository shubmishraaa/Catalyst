"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm rounded-[2rem] border-none shadow-sm bg-card border border-border">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Log in to access your Catalyst account.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
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
            />
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold text-lg mt-4 shadow-xl shadow-primary/20">
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Log In"}
            </Button>
          </form>
          <p className="text-center mt-6 text-muted-foreground text-sm">
            Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
