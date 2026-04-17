"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/contexts/SessionContext";
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
    <div
      className={
        dark
          ? "rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur"
          : "rounded-2xl border border-border bg-card px-4 py-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={dark ? "text-xs text-white/60" : "text-xs text-muted-foreground"}>Session in progress</p>
          <p className="font-semibold">
            {activeSession.storeId} · {elapsedTime} elapsed · {remainingTime} left
          </p>
        </div>
        <Button
          onClick={stopSession}
          disabled={stopping || sessionBusy}
          variant="destructive"
          className="h-9 rounded-xl"
        >
          {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          <span className="ml-2">Stop</span>
        </Button>
      </div>
    </div>
  );
}

