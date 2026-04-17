"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Package, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SessionBanner } from "@/components/shopper/SessionBanner";

export default function ExitAudit() {
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const auditItems = [
    { name: "Organic Whole Milk", qty: 1 },
    { name: "Artisan Sourdough", qty: 1 },
  ];

  const handleConfirm = () => {
    toast({
      title: "Audit Passed",
      description: "Thank you for confirming. You're all set!",
    });
    setConfirmed(true);
    setTimeout(() => {
      router.push("/shopper/home");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-20">
      <div className="max-w-lg mx-auto w-full space-y-8">
        <SessionBanner />
        <div className="text-center space-y-4">
          <div className="bg-accent/10 w-fit p-4 rounded-full mx-auto">
            <Search className="h-12 w-12 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Random Exit Check</h1>
          <p className="text-muted-foreground">
            To ensure a smooth shopping experience for everyone, we conduct quick random verifications.
          </p>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-accent/20 bg-accent/5 overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items to Verify
            </CardTitle>
            <CardDescription>Please show these items to the staff if requested.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {auditItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-background rounded-2xl border border-accent/10">
                <span className="font-bold">{item.name}</span>
                <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold">Qty: {item.qty}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Button
            onClick={handleConfirm}
            disabled={confirmed}
            className="h-16 rounded-2xl text-lg font-bold bg-accent hover:bg-accent/90"
          >
            {confirmed ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" /> Verified
              </span>
            ) : (
              "I have these items"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            This helps us keep self-checkout fast and reliable.
          </p>
        </div>
      </div>
    </div>
  );
}
