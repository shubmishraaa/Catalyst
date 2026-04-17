"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Wallet, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

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
  const { total } = useCart();

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
    if (!activeSession) {
      toast({ title: "No active session", variant: "destructive" });
      return;
    }

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
      }, 500);
    } catch (err: any) {
      toast({ title: "Transaction init failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSuccess = async () => {
    setLoading(true);

    try {
      if (currentTxnId) {
        await updateDoc(doc(db, "transactions", currentTxnId), {
          status: "success",
          completedAt: serverTimestamp(),
        });
      }

      await endSession({
        totalAmount,
        transactionId: currentTxnId,
        auditStatus: "not_required",
      });

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
        await updateDoc(doc(db, "transactions", currentTxnId), {
          status: "failed",
          completedAt: serverTimestamp(),
        });
      }
      toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      setStatus("pending");
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    router.push("/shopper/home");
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="bg-primary/10 p-8 rounded-full mb-8 animate-in zoom-in duration-500 delay-300">
          <CheckCircle2 className="h-24 w-24 text-primary" />
        </div>

        <h1 className="text-4xl font-bold mb-4">Payment Success!</h1>
        <p className="text-muted-foreground text-lg mb-12 max-w-xs mx-auto">
          Your transaction of <span className="text-foreground font-bold">Rs. {totalAmount.toFixed(2)}</span> was completed successfully.
        </p>

        <Card className="w-full max-w-sm mb-12 border-none bg-muted/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono font-bold">{txnRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-bold">Catalyst UPI</span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleExit} className="w-full max-w-sm h-16 rounded-2xl text-lg font-bold">
          Exit Store <ArrowRight className="ml-2 h-6 w-6" />
        </Button>
      </div>
    );
  }

  if (status === "returned") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in">
        <h2 className="text-2xl font-bold text-center">Did you complete the payment?</h2>
        <Card className="w-full max-w-sm border-none bg-muted/30 p-8 text-center rounded-[2rem]">
          <p className="text-muted-foreground mb-2">Amount</p>
          <h2 className="text-5xl font-bold text-primary">Rs. {totalAmount.toFixed(2)}</h2>
        </Card>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button onClick={handleSuccess} disabled={loading} className="w-full h-16 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20">
            Payment Successful
          </Button>
          <Button onClick={handleFailure} disabled={loading} variant="destructive" className="w-full h-16 rounded-2xl font-bold text-lg">
            Payment Failed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 pt-12">
      <div className="max-w-lg mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Secure Checkout</h1>
        </header>

        <Card className="border-none bg-muted/30 p-8 text-center rounded-[2rem]">
          <p className="text-muted-foreground mb-2">Amount to Pay</p>
          <h2 className="text-5xl font-bold text-primary">Rs. {totalAmount.toFixed(2)}</h2>
        </Card>

        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose Payment Method</h3>
          <Button
            className="w-full h-20 rounded-3xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground flex justify-between px-8"
            onClick={handleUPI}
            disabled={loading || totalAmount <= 0}
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary p-2 rounded-xl">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold">Pay via UPI</p>
                <p className="text-xs text-muted-foreground">Opens your UPI app for payment</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          After returning from UPI, mark whether the payment was successful or failed.
        </p>
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
