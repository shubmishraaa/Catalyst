"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, AlertTriangle, Tag, Loader2, Square, ArrowRight } from "lucide-react";
import { BottomNav } from "@/components/shopper/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, setDoc } from "firebase/firestore";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { DEMO_PRODUCTS } from "@/lib/demo-products";

export default function ProductScanner() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [scanEvents, setScanEvents] = useState<number[]>([]);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "live" | "blocked" | "unsupported">("idle");
  const [stoppingSession, setStoppingSession] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const router = useRouter();

  const { toast } = useToast();
  const { activeSession, loadingSession, elapsedTime, remainingTime, endSession, sessionBusy } = useSession();
  const { user, profile, loading } = useAuth();
  const { itemCount } = useCart();

  const normalizeAllergen = (value: string) => value.trim().toLowerCase();
  const alertsEnabled = profile?.allergenAlertsEnabled !== false;
  const userAllergens = alertsEnabled ? (profile?.allergens || []).map(normalizeAllergen) : [];

  useEffect(() => {
    const seedDemoProducts = async () => {
      try {
        await Promise.all(
          DEMO_PRODUCTS.map((product) =>
            setDoc(
              doc(db, "products", product.id),
              {
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                calories: product.calories,
                allergens: product.allergens,
                offer: product.offer,
                image: product.image,
              },
              { merge: true }
            )
          )
        );
      } catch (error) {
        console.warn("Could not seed demo products", error);
      }
    };

    void seedDemoProducts();
  }, []);

  const initScanner = () => {
    if (!videoRef.current) return;

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    setCameraStatus("starting");
    readerRef.current.decodeFromConstraints(
      { audio: false, video: { facingMode: "environment" } },
      videoRef.current!,
      (result, _error, controls) => {
        controlsRef.current = controls;
        setCameraStatus("live");
        if (result) {
          controls.stop();
          if (navigator.vibrate) navigator.vibrate(200);
          processBarcode(result.getText());
        }
      }
    ).catch((err) => {
      console.warn("Camera Init Error:", err);
      setCameraStatus(
        typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia ? "unsupported" : "blocked"
      );
    });
  };

  useEffect(() => {
    if (loading || loadingSession) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!activeSession) {
      router.replace("/shopper/qr-start");
    }
  }, [activeSession, loading, loadingSession, router, user]);

  useEffect(() => {
    if (!activeSession || scannedProduct) return;

    initScanner();
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [activeSession, scannedProduct]);

  const createFlag = async (reason: string, severity: "low" | "medium" | "high") => {
    if (!activeSession) return;

    await addDoc(collection(db, "flags"), {
      sessionId: activeSession.id,
      reason,
      severity,
      status: "open",
      timestamp: serverTimestamp(),
    }).catch(() => {});
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (controlsRef.current) controlsRef.current.stop();
    processBarcode(barcodeInput);
  };

  const addProductToCart = async (product: any, closeOverlay = false) => {
    if (!activeSession || !product) {
      toast({ title: "No active session", variant: "destructive" });
      return false;
    }

    try {
      const productAllergens = Array.isArray(product.allergens)
        ? product.allergens.map((allergen: string) => normalizeAllergen(allergen))
        : [];
      const matchingProductAllergens = productAllergens.filter((allergen: string) =>
        userAllergens.includes(allergen)
      );

      const existingItemQuery = query(
        collection(db, "cartItems"),
        where("sessionId", "==", activeSession.id),
        where("productId", "==", product.id)
      );
      const existingItemSnapshot = await getDocs(existingItemQuery);

      if (!existingItemSnapshot.empty) {
        const existingItem = existingItemSnapshot.docs[0];
        const currentQuantity = Number(existingItem.data().quantity) || 0;
        await updateDoc(doc(db, "cartItems", existingItem.id), {
          quantity: currentQuantity + 1,
          addedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "cartItems"), {
          sessionId: activeSession.id,
          productId: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: 1,
          allergens: productAllergens,
          image: product.image || null,
          offer: product.offer?.discountPercent ? product.offer : null,
          addedAt: serverTimestamp(),
        });
      }

      if (alertsEnabled && matchingProductAllergens.length > 0) {
        toast({
          title: "Allergen warning",
          description: `${product.name} matches your saved allergens: ${matchingProductAllergens.join(", ")}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Added to cart",
          description: alertsEnabled
            ? `${product.name} added. No saved allergen match detected.`
            : `${product.name} added.`,
        });
      }

      if (closeOverlay) {
        resumeScanner();
      }

      return true;
    } catch (_e) {
      toast({ title: "Error adding item", variant: "destructive" });
      return false;
    }
  };

  const processBarcode = async (code: string) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      toast({ title: "Enter a barcode first", variant: "destructive" });
      return;
    }

    const now = Date.now();
    const newEvents = [...scanEvents, now].filter((timestamp) => now - timestamp < 10000);
    setScanEvents(newEvents);

    if (newEvents.length > 5) {
      toast({
        title: "Unusual scan pattern detected",
        variant: "destructive",
      });
      await createFlag(`Rapid scanning detected (${newEvents.length} scans in 10s)`, "high");
    }

    try {
      const q = query(collection(db, "products"), where("barcode", "==", normalizedCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        const fallbackProduct = DEMO_PRODUCTS.find((product) => product.barcode === normalizedCode);
        if (!fallbackProduct) {
          toast({ title: "Product not found", variant: "destructive" });
          setBarcodeInput("");
          initScanner();
          return;
        }

        const added = await addProductToCart(fallbackProduct);
        if (added) {
          setScannedProduct(fallbackProduct);
          setBarcodeInput("");
        } else {
          initScanner();
        }
      } else {
        const product = { id: snap.docs[0].id, ...snap.docs[0].data() };
        const added = await addProductToCart(product);
        if (added) {
          setScannedProduct(product);
          setBarcodeInput("");
        } else {
          initScanner();
        }
      }
    } catch (_e) {
      toast({ title: "Error querying database", variant: "destructive" });
      setBarcodeInput("");
      initScanner();
    }
  };

  const resumeScanner = () => {
    setScannedProduct(null);
    setBarcodeInput("");
    setCameraStatus("idle");
  };

  const addToCart = async () => {
    await addProductToCart(scannedProduct, true);
  };

  const stopSession = async () => {
    setStoppingSession(true);
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
      await endSession({ status: "abandoned", endReason: "manual" });
      toast({
        title: "Session stopped",
        description: "Your store session has been ended.",
      });
      router.replace("/shopper/home");
    } catch (error) {
      console.error("Error stopping session", error);
      toast({ title: "Could not stop session", variant: "destructive" });
    } finally {
      setStoppingSession(false);
    }
  };

  const matchingAllergens = (scannedProduct?.allergens || []).filter((allergen: string) =>
    userAllergens.includes(normalizeAllergen(allergen))
  );

  return (
    <div className="min-h-screen bg-black relative flex flex-col">
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="min-w-full min-h-full object-cover opacity-60"
          muted
          playsInline
        />
      </div>

      <div className="p-6 pt-12 flex justify-between items-center z-20">
        <div>
          <h2 className="text-white font-bold text-xl">Scanning...</h2>
          <p className="text-xs text-white/60">Elapsed {elapsedTime} • Remaining {remainingTime}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30 flex items-center gap-2">
            <span className="text-white/60 text-xs font-medium">Session Active:</span>
            <span className="text-primary text-sm font-bold">{elapsedTime}</span>
          </div>
          <Button
            onClick={stopSession}
            disabled={stoppingSession || sessionBusy}
            variant="destructive"
            className="h-10 rounded-xl"
          >
            {stoppingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Stop Session</span>
          </Button>
        </div>
      </div>

      <div className="px-6 mt-4 z-20 flex gap-2">
        <form onSubmit={handleManualScan} className="flex-1 flex gap-2">
          <Input
            placeholder="Manual barcode (try: 123)"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="bg-white/10 border-white/20 text-white rounded-xl placeholder:text-white/40"
          />
          <Button type="submit" variant="secondary" className="rounded-xl h-10 w-10 p-0">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
      </div>

      <div className="px-6 mt-3 z-20">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur">
          {cameraStatus === "starting" && "Starting camera..."}
          {cameraStatus === "live" && "Camera is live. Point it at a barcode or use manual entry."}
          {cameraStatus === "blocked" && "Camera access is blocked. Allow camera access and refresh, or keep using manual barcode entry."}
          {cameraStatus === "unsupported" && "Camera access is not available here. You can still scan with manual barcode entry."}
          {cameraStatus === "idle" && "Preparing scanner..."}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 pointer-events-none">
        <div className="relative w-full aspect-square max-w-sm border-2 border-white/30 rounded-[2.5rem] overflow-hidden">
          <div className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_20px_hsl(var(--primary))] scan-beam z-30" />

          <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl" />
          <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl" />
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl" />
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl" />
        </div>
      </div>

      {scannedProduct && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-all duration-500 animate-in fade-in">
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />

            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                  {scannedProduct.image ? <img src={scannedProduct.image} alt="product" className="w-full h-full object-cover" /> : "No Image"}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">{scannedProduct.name}</h3>
                  <p className="text-primary font-bold text-xl">Rs. {scannedProduct.price}</p>
                  <p className="text-muted-foreground text-sm">{scannedProduct.calories || 0} cal / serving</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={resumeScanner}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            {scannedProduct.offer?.discountPercent ? (
              <div className="mb-6 rounded-2xl bg-accent/10 px-4 py-3 text-accent flex items-center gap-3">
                <Tag className="h-5 w-5" />
                <div>
                  <p className="font-bold">{scannedProduct.offer.discountPercent}% off available</p>
                  <p className="text-xs text-muted-foreground">This offer will be applied in your cart automatically.</p>
                </div>
              </div>
            ) : null}

            {(scannedProduct.allergens || []).length > 0 && (
              <div className="mb-8 space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Allergen Insights</h4>
                <div className="flex flex-wrap gap-2">
                  {scannedProduct.allergens.map((allergen: string) => {
                    const isUnsafe = matchingAllergens.includes(allergen.toLowerCase());
                    return (
                      <div
                        key={allergen}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-sm font-bold flex items-center",
                          isUnsafe ? "bg-destructive text-white" : "bg-green-500 text-white"
                        )}
                      >
                        {isUnsafe ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                        {allergen}
                      </div>
                    );
                  })}
                </div>
                {matchingAllergens.length > 0 ? (
                  <p className="text-sm text-destructive font-medium">
                    Warning: this product matches your saved allergens.
                  </p>
                ) : (
                  <p className="text-sm text-green-600 font-medium">
                    No saved allergen match detected for this product.
                  </p>
                )}
              </div>
            )}

            <Button onClick={addToCart} className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20">
              <Plus className="h-6 w-6 mr-2" /> Add One More
            </Button>
          </div>
        </div>
      )}

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
