"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function CheckoutContent() {
  const [status, setStatus] = useState<"pending" | "returned" | "success">("pending");
  const [loading, setLoading] = useState(false);
  const [currentTxnId, setCurrentTxnId] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);

  const router = useRouter();
  const { toast } = useToast();
  const { activeSession, endSession } = useSession();
  const { user, loading: authLoading } = useAuth();
  const { items, total, savings } = useCart();

  useEffect(() => {
    setTxnRef(`TXN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!activeSession) {
      router.replace("/shopper/qr-start");
    }
  }, [activeSession, authLoading, router, user]);

  useEffect(() => {
    setTotalAmount(total);
  }, [total]);

  const handleUPI = async () => {
    if (!activeSession) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "transactions"), {
        sessionId: activeSession.id,
        userId: activeSession.userId,
        storeId: activeSession.storeId,
        amount: totalAmount,
        status: "pending",
        txnRef,
        createdAt: serverTimestamp(),
      });
      setCurrentTxnId(docRef.id);
      window.location.href = `upi://pay?pa=catalyst@upi&pn=Catalyst&am=${totalAmount.toFixed(2)}&cu=INR`;
      setTimeout(() => {
        setStatus("returned");
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      toast({ title: "Transaction init failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSuccess = async () => {
    setLoading(true);
    try {
      if (currentTxnId) {
        await updateDoc(doc(db, "transactions", currentTxnId), { status: "success", completedAt: serverTimestamp() });
      }
      await endSession({ totalAmount, transactionId: currentTxnId, auditStatus: "not_required" });
      setStatus("success");
    } catch (err: any) {
      toast({ title: "Could not complete checkout", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFailure = async () => {
    setLoading(true);
    try {
      if (currentTxnId) {
        await updateDoc(doc(db, "transactions", currentTxnId), { status: "failed", completedAt: serverTimestamp() });
      }
      toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      setStatus("pending");
    } finally {
      setLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="shopper-shell page-transition flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="relative mb-6">
          <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
            <circle cx="60" cy="60" r="54" fill="rgba(0,212,170,0.08)" stroke="rgba(0,212,170,0.2)" />
            <path className="checkmark-path" d="M38 62L53 77L84 46" fill="none" stroke="#00D4AA" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {Array.from({ length: 20 }).map((_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                left: "50%",
                top: "50%",
                backgroundColor: ["#00D4AA", "#7C3AED", "#FFB800", "#F0F4FF"][index % 4],
                ["--confetti-x" as any]: `${(index - 10) * 12}px`,
                ["--confetti-y" as any]: `${-70 - (index % 5) * 16}px`,
                ["--confetti-r" as any]: `${index * 24}deg`,
                animationDelay: `${index * 0.02}s`,
              }}
            />
          ))}
        </div>
        <h1 className="text-[22px] font-extrabold text-primary">Payment confirmed!</h1>
        <p className="mt-3 text-[11px] font-mono text-[color:var(--shopper-text-secondary)]">{txnRef || currentTxnId}</p>
        <p className="mt-2 text-[13px] text-[color:var(--shopper-text-secondary)]">{activeSession?.storeId || "Catalyst Store"} · {formatCurrency(totalAmount)}</p>
        <Button onClick={() => router.push("/shopper/home")} className="mt-8 h-12 w-full max-w-sm rounded-[14px] bg-primary text-primary-foreground">Done — exit store</Button>
      </div>
    );
  }

  return (
    <div className="shopper-shell page-transition min-h-screen px-5 pb-10 pt-10">
      <div className="mx-auto max-w-lg">
        <button onClick={() => router.back()} className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--shopper-border)] bg-[color:var(--shopper-surface-1)]">
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="shopper-card p-4">
          <p className="shopper-label">Checkout</p>
          <h1 className="mt-2 text-[22px] font-extrabold tracking-[-0.5px]">Order summary</h1>
          <div className="mt-4 space-y-3 text-[13px]">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[color:var(--shopper-text-secondary)]">
                <span className="truncate pr-4">{item.name} × {item.quantity}</span>
                <span>{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span>
              </div>
            ))}
            {savings > 0 ? <div className="flex justify-between text-primary"><span>Savings</span><span>{formatCurrency(savings)}</span></div> : null}
            <div className="h-px bg-[color:var(--shopper-border)]" />
            <div className="flex justify-between text-[18px] font-extrabold"><span>Total</span><span>{formatCurrency(totalAmount)}</span></div>
          </div>
        </div>

        <Button onClick={handleUPI} disabled={loading || totalAmount <= 0} className="mt-5 h-12 w-full rounded-[14px] bg-primary text-primary-foreground">
          <Lock className="h-4 w-4" /> Pay with UPI — {formatCurrency(totalAmount)}
        </Button>

        {status === "returned" ? (
          <div className="mt-4 space-y-3">
            <Button onClick={handleSuccess} disabled={loading} className="h-12 w-full rounded-[14px] bg-primary text-primary-foreground">Payment successful</Button>
            <Button onClick={handleFailure} disabled={loading} variant="secondary" className="h-12 w-full rounded-[14px] bg-[color:var(--shopper-surface-2)] text-[color:var(--shopper-text-primary)]">Payment failed</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<div className="shopper-shell flex min-h-screen items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
