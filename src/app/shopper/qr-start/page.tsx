"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, QrCode, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Input } from "@/components/ui/input";

const DEMO_STORES = ["catalyst-express-01", "freshmart-west", "smartbasket-central"];

export default function QRStart() {
  const [scanning, setScanning] = useState(true);
  const [storeIdInput, setStoreIdInput] = useState(DEMO_STORES[0]);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const router = useRouter();
  const { toast } = useToast();
  const { startSession, sessionBusy } = useSession();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  const requestCameraAccess = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraState("granted");
    } catch (error) {
      console.warn("Camera permission not granted", error);
      setCameraState("denied");
    }
  };

  useEffect(() => {
    if (!loading && user && cameraState === "idle") {
      void requestCameraAccess();
    }
  }, [cameraState, loading, user]);

  const startStoreSession = async (storeId: string) => {
    setScanning(false);

    try {
      await startSession(storeId);
      toast({
        title: "Store Identified",
        description: `Session started for ${storeId}`,
      });
      router.push("/shopper/scan");
    } catch (err: any) {
      toast({
        title: "Error starting session",
        description: err.message,
        variant: "destructive",
      });
      setScanning(true);
    }
  };

  const handleManualStart = async () => {
    await startStoreSession(storeIdInput);
  };

  const handleRandomStore = async () => {
    const randomStore = DEMO_STORES[Math.floor(Math.random() * DEMO_STORES.length)];
    setStoreIdInput(randomStore);
    await startStoreSession(randomStore);
  };

  return (
    <div className="min-h-screen bg-black relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-10" />
      <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/store/1080/1920')] bg-cover bg-center" />

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => router.back()}
        >
          <X className="h-8 w-8" />
        </Button>
        <h2 className="text-white font-bold text-lg">Scan Store QR</h2>
        <div className="w-10" />
      </div>

      <div className="relative z-20 w-64 h-64 border-2 border-white/20 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <QrCode className="h-16 w-16 text-white/40" />
        </div>

        {scanning && <div className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_15px_hsl(var(--primary))] scan-beam z-30" />}

        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
      </div>

      <div className="absolute bottom-20 left-0 right-0 px-10 text-center z-20">
        <p className="text-white/80 mb-8 animate-pulse">Enter the store QR or store ID to start a linked shopping session</p>
        <div className="mb-4 rounded-3xl bg-white/10 p-4 text-left text-sm text-white/80 backdrop-blur">
          <div className="flex items-center gap-2 font-medium">
            {cameraState === "requesting" || sessionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span>
              {cameraState === "granted" && "Camera access is ready for barcode scanning."}
              {cameraState === "requesting" && "Requesting camera access..."}
              {cameraState === "denied" && "Camera access was blocked. You can still start a session and use manual barcode entry."}
              {cameraState === "unsupported" && "This device/browser does not expose camera access here. Manual barcode entry will still work."}
              {cameraState === "idle" && "Preparing camera access..."}
            </span>
          </div>
          {cameraState === "denied" ? (
            <Button
              onClick={requestCameraAccess}
              variant="ghost"
              className="mt-3 h-9 rounded-xl bg-white/10 px-3 text-white hover:bg-white/20"
            >
              Allow Camera Again
            </Button>
          ) : null}
        </div>
        <div className="mb-4 rounded-3xl bg-white/10 p-4 backdrop-blur">
          <Input
            value={storeIdInput}
            onChange={(e) => setStoreIdInput(e.target.value)}
            placeholder="Enter store ID"
            className="border-white/20 bg-black/20 text-white placeholder:text-white/50"
          />
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleManualStart}
            className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-bold text-lg"
            disabled={!scanning || !storeIdInput.trim() || sessionBusy}
          >
            {!scanning || sessionBusy ? "Starting Session..." : "Start Session with This Store"}
          </Button>
          <Button
            onClick={handleRandomStore}
            variant="outline"
            className="w-full h-14 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
            disabled={!scanning || sessionBusy}
          >
            Use Random Demo Store
          </Button>
        </div>
      </div>
    </div>
  );
}
