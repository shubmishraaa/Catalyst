"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/contexts/SessionContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Loader2, Square } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function SessionBanner({ dark = false }: { dark?: boolean }) {
  const { activeSession, elapsedTime, remainingTime, endSession, sessionBusy } = useSession();
  const [stopping, setStopping] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  if (!activeSession) {
    return null;
  }

  const stopSession = async () => {
    setStopping(true);
    try {
      await endSession({ status: "abandoned", endReason: "manual" });
      toast({ title: "Session stopped" });
      router.replace("/shopper/home");
    } catch {
      toast({ title: "Could not stop session", variant: "destructive" });
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className={dark ? "rounded-[14px] border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur" : "shopper-card px-4 py-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={dark ? "shopper-label text-white/70" : "shopper-label"}>Session Active</p>
          <p className={cn("truncate text-[13px] font-bold", dark ? "text-white" : "text-[color:var(--shopper-text-primary)]")}>
            {activeSession.storeId} · {elapsedTime} elapsed · {remainingTime} left
          </p>
        </div>
        <Button onClick={stopSession} disabled={stopping || sessionBusy} variant="destructive" className="h-9 rounded-xl px-3">
          {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          <span className="ml-1">Stop</span>
        </Button>
      </div>
    </div>
  );
}
