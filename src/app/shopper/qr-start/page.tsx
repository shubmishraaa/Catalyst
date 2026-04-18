"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { SessionBanner } from "@/components/shopper/SessionBanner";
import { BrowserMultiFormatReader } from "@zxing/browser";

const DEMO_STORES = ["catalyst-express-01", "freshmart-west", "smartbasket-central"];

export default function QRStart() {
  const [scanning, setScanning] = useState(true);
  const [storeIdInput, setStoreIdInput] = useState(DEMO_STORES[0]);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const startingSessionRef = useRef(false);
  const router = useRouter();
  const { toast } = useToast();
  const { startSession, sessionBusy } = useSession();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  const requestCameraAccess = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }
      setCameraState("granted");
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => {
    if (!loading && user && cameraState === "idle") void requestCameraAccess();
  }, [cameraState, loading, user]);

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  };

  const beginStoreScanner = () => {
    if (!videoRef.current || cameraState !== "granted" || !scanning || startingSessionRef.current) return;
    if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();

    readerRef.current
      .decodeFromConstraints(
        { audio: false, video: { facingMode: "environment" } },
        videoRef.current,
        (result, _error, controls) => {
          controlsRef.current = controls;
          if (!result || startingSessionRef.current) return;
          startingSessionRef.current = true;
          controls.stop();
          const scannedStoreId = result.getText().trim();
          setStoreIdInput(scannedStoreId);
          void startStoreSession(scannedStoreId).finally(() => {
            startingSessionRef.current = false;
          });
        }
      )
      .catch(() => {});
  };

  useEffect(() => {
    if (cameraState !== "granted" || !scanning) {
      stopScanner();
      return;
    }
    beginStoreScanner();
    return () => stopScanner();
  }, [cameraState, scanning]);

  useEffect(() => {
    return () => {
      stopScanner();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startStoreSession = async (storeId: string) => {
    const normalizedStoreId = storeId.trim();
    if (!normalizedStoreId) throw new Error("Store ID is required");
    setScanning(false);
    stopScanner();

    try {
      const sessionId = await Promise.race([
        startSession(normalizedStoreId),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Session start timed out. Please try again.")), 12000)),
      ]);
      toast({ title: "Store identified", description: `Session started for ${normalizedStoreId}` });
      router.push(`/shopper/scan?session=${sessionId}`);
    } catch (err: any) {
      toast({ title: "Error starting session", description: err.message, variant: "destructive" });
      setScanning(true);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060C18] text-[color:#F0F4FF]">
      {cameraState === "granted" ? <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-45" autoPlay muted playsInline /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,24,0.35)_0%,rgba(6,12,24,0.68)_60%,rgba(10,15,30,0.98)_100%)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 pb-8 pt-10">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[color:#1E2D45] bg-[color:#111827]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-[color:#1E2D45] bg-[color:#111827] px-4 py-1.5 text-[11px] font-semibold">
            Scan Store QR
          </div>
          <div className="h-8 w-8" />
        </div>

        <div className="mx-auto mt-10 w-full max-w-[320px]">
          <div className="relative mx-auto h-[300px] rounded-[28px] border border-[color:#1E2D45] bg-[#08111f]/70">
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(0,212,170,0.08),transparent_30%)]" />
            <div className="absolute left-5 top-5 h-8 w-8 border-l-[3px] border-t-[3px] border-primary" />
            <div className="absolute right-5 top-5 h-8 w-8 border-r-[3px] border-t-[3px] border-primary" />
            <div className="absolute bottom-5 left-5 h-8 w-8 border-b-[3px] border-l-[3px] border-primary" />
            <div className="absolute bottom-5 right-5 h-8 w-8 border-b-[3px] border-r-[3px] border-primary" />
            {scanning ? <div className="scan-line absolute left-8 right-8 top-16 h-[2px] bg-primary" style={{ ["--scan-distance" as any]: "180px" }} /> : null}
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="h-16 w-16 text-[color:#243044]" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SessionBanner dark />
        </div>

        <div className="mt-4 rounded-[16px] border border-[color:#1E2D45] bg-[color:#111827]/90 p-4">
          <div className="flex items-start gap-3 text-[12px] text-[color:#8B95B0]">
            {cameraState === "requesting" || sessionBusy ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" /> : <Camera className="mt-0.5 h-4 w-4 text-primary" />}
            <span>
              {cameraState === "granted" && "Camera is live. Align the store QR in the frame or continue with a manual store ID."}
              {cameraState === "requesting" && "Requesting camera access..."}
              {cameraState === "denied" && "Camera access was blocked. You can still enter the store ID manually."}
              {cameraState === "unsupported" && "Camera is unavailable here. Manual entry still works."}
              {cameraState === "idle" && "Preparing camera access..."}
            </span>
          </div>
          {cameraState === "denied" ? (
            <Button onClick={requestCameraAccess} variant="ghost" className="mt-3 h-9 rounded-xl border border-[color:#1E2D45] bg-[color:#1C2537] text-[color:#F0F4FF] hover:bg-[color:#243044]">
              Allow camera again
            </Button>
          ) : null}
        </div>

        <div className="mt-4 rounded-[18px] border border-[color:#1E2D45] bg-[color:#111827] p-4">
          <Input value={storeIdInput} onChange={(e) => setStoreIdInput(e.target.value)} placeholder="Enter store ID" className="shopper-input h-12 border-[color:#1E2D45] bg-[color:#1C2537] text-[color:#F0F4FF]" />
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {DEMO_STORES.map((store) => (
              <button key={store} onClick={() => setStoreIdInput(store)} className="whitespace-nowrap rounded-lg border border-[color:#1E2D45] bg-[color:#1C2537] px-3 py-2 text-[10px] font-bold text-[color:#8B95B0]">
                {store}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <Button onClick={() => void startStoreSession(storeIdInput)} disabled={!scanning || !storeIdInput.trim() || sessionBusy} className="h-12 w-full rounded-[14px] bg-primary text-primary-foreground">
            {!scanning || sessionBusy ? "Starting session..." : "Start session"}
          </Button>
          <Button onClick={() => void startStoreSession(DEMO_STORES[Math.floor(Math.random() * DEMO_STORES.length)])} variant="secondary" disabled={!scanning || sessionBusy} className="h-12 w-full rounded-[14px] bg-[color:#1C2537] text-[color:#F0F4FF]">
            Use random demo store
          </Button>
        </div>
      </div>
    </div>
  );
}
