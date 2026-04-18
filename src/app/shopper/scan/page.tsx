"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, AlertTriangle, Tag, Loader2, Square, Flashlight, Flame, X } from "lucide-react";
import { BottomNav } from "@/components/shopper/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, setDoc, limit } from "firebase/firestore";
import { useSession } from "@/lib/contexts/SessionContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCart } from "@/hooks/use-cart";
import { DEMO_PRODUCTS } from "@/lib/demo-products";

const categoryEmoji = ["🥛", "🍪", "🥜", "🍞", "🥣", "🛒"];

export default function ProductScanner() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [scanEvents, setScanEvents] = useState<number[]>([]);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "live" | "blocked" | "unsupported">("idle");
  const [stoppingSession, setStoppingSession] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [quickProducts, setQuickProducts] = useState<any[]>([]);
  const [banner, setBanner] = useState("");
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

        const quickSnap = await getDocs(query(collection(db, "products"), limit(3)));
        const fetched = quickSnap.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }));
        setQuickProducts(fetched.length ? fetched : DEMO_PRODUCTS.slice(0, 3));
      } catch {
        setQuickProducts(DEMO_PRODUCTS.slice(0, 3));
      }
    };

    void seedDemoProducts();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const initScanner = () => {
    if (!videoRef.current) return;
    if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();

    setCameraStatus("starting");
    readerRef.current
      .decodeFromConstraints(
        { audio: false, video: { facingMode: "environment" } },
        videoRef.current,
        (result, _error, controls) => {
          controlsRef.current = controls;
          setCameraStatus("live");
          if (result) {
            controls.stop();
            if (navigator.vibrate) navigator.vibrate(200);
            void processBarcode(result.getText());
          }
        }
      )
      .catch(() => {
        setCameraStatus(typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia ? "unsupported" : "blocked");
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
      if (controlsRef.current) controlsRef.current.stop();
    };
  }, [activeSession, scannedProduct]);

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;

    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch {
      toast({ title: "Torch not supported on this camera", variant: "destructive" });
    }
  };

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

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (controlsRef.current) controlsRef.current.stop();
    await processBarcode(barcodeInput);
  };

  const addProductToCart = async (product: any, closeOverlay = false) => {
    if (!activeSession || !product) {
      toast({ title: "No active session", variant: "destructive" });
      return false;
    }

    try {
      const productAllergens = Array.isArray(product.allergens) ? product.allergens.map((allergen: string) => normalizeAllergen(allergen)) : [];
      const matchingProductAllergens = productAllergens.filter((allergen: string) => userAllergens.includes(allergen));

      const existingItemQuery = query(collection(db, "cartItems"), where("sessionId", "==", activeSession.id), where("productId", "==", product.id));
      const existingItemSnapshot = await getDocs(existingItemQuery);

      if (!existingItemSnapshot.empty) {
        const existingItem = existingItemSnapshot.docs[0];
        const currentQuantity = Number(existingItem.data().quantity) || 0;
        await updateDoc(doc(db, "cartItems", existingItem.id), { quantity: currentQuantity + 1, addedAt: serverTimestamp() });
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

      if (navigator.vibrate) navigator.vibrate(200);

      if (alertsEnabled && matchingProductAllergens.length > 0) {
        toast({
          title: "Allergen warning",
          description: `${product.name} matches your saved allergens: ${matchingProductAllergens.join(", ")}.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Added to cart", description: `${product.name} added.` });
      }

      if (closeOverlay) resumeScanner();
      return true;
    } catch {
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
    const newEvents = [...scanEvents, now].filter((timestamp) => now - timestamp <= 15000);
    setScanEvents(newEvents);

    if (newEvents.length >= 5) {
      setBanner("Unusual scan pattern detected");
      await createFlag(`Rapid scanning detected (${newEvents.length} scans in 15s)`, "high");
    }

    try {
      const q = query(collection(db, "products"), where("barcode", "==", normalizedCode));
      const snap = await getDocs(q);
      const product = snap.empty ? DEMO_PRODUCTS.find((item) => item.barcode === normalizedCode) : { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (!product) {
        toast({ title: "Product not found", variant: "destructive" });
        setBarcodeInput("");
        initScanner();
        return;
      }

      const added = await addProductToCart(product);
      if (added) {
        setScannedProduct(product);
        setBarcodeInput("");
      } else {
        initScanner();
      }
    } catch {
      toast({ title: "Error querying database", variant: "destructive" });
      setBarcodeInput("");
      initScanner();
    }
  };

  const resumeScanner = () => {
    setScannedProduct(null);
    setBarcodeInput("");
    setCameraStatus("idle");
    setTorchOn(false);
  };

  const stopSession = async () => {
    setStoppingSession(true);
    try {
      if (controlsRef.current) controlsRef.current.stop();
      await endSession({ status: "abandoned", endReason: "manual" });
      toast({ title: "Session stopped", description: "Your store session has been ended." });
      router.replace("/shopper/home");
    } catch {
      toast({ title: "Could not stop session", variant: "destructive" });
    } finally {
      setStoppingSession(false);
    }
  };

  const matchingAllergens = (scannedProduct?.allergens || []).filter((allergen: string) => userAllergens.includes(normalizeAllergen(allergen)));
  const selectedEmoji = categoryEmoji[(scannedProduct?.name?.length || 0) % categoryEmoji.length];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060C18] pb-28 text-[color:#F0F4FF]">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-40" muted playsInline />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,24,0.35)_0%,rgba(6,12,24,0.6)_55%,rgba(10,15,30,0.98)_100%)]" />

      {banner ? (
        <div className="toast-slide absolute left-4 right-4 top-4 z-50 rounded-xl border border-[#ff475733] bg-[#120b12] px-4 py-3 text-[13px] font-bold text-[#ff4757]">
          {banner}
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 pt-10">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[color:#1E2D45] bg-[color:#111827]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-[color:#1E2D45] bg-[color:#111827] px-4 py-1.5 text-[11px] font-semibold">
            {activeSession?.storeId || "Catalyst Express"}
          </div>
          <button onClick={toggleTorch} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[color:#1E2D45] bg-[color:#111827]">
            {torchOn ? <Flame className="h-4 w-4 text-[#FFB800]" /> : <Flashlight className="h-4 w-4 text-[color:#8B95B0]" />}
          </button>
        </div>

        <div className="px-5 pt-6 text-center">
          <p className="shopper-label">Camera live</p>
        </div>

        <div className="relative mx-auto mt-8 flex h-[46vh] w-full max-w-md items-center justify-center px-5">
          <div className="relative h-[68%] w-full max-w-[320px]" style={{ ["--scan-distance" as any]: "190px" }}>
            <p className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] text-[color:#8B95B0]">Align barcode here</p>
            <div className="scan-line absolute left-5 right-5 top-10 z-20 h-[2px] bg-primary opacity-80" />
            <div className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-primary" />
            <div className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-primary" />
            <div className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-primary" />
            <div className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-primary" />
          </div>
        </div>

        <div className="mt-auto rounded-t-[28px] border-t border-[color:#1E2D45] bg-[color:#0A0F1E] px-5 pb-8 pt-5">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[color:#8B95B0]">
            <span>{cameraStatus === "live" ? "Camera is live and ready." : cameraStatus === "starting" ? "Starting camera..." : cameraStatus === "blocked" ? "Camera blocked. Use manual entry." : cameraStatus === "unsupported" ? "Camera unavailable here." : "Preparing scanner..."}</span>
            <span>{elapsedTime} / {remainingTime}</span>
          </div>

          <form onSubmit={handleManualScan}>
            <Input
              placeholder="Enter barcode manually e.g. 8901058851038"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="shopper-input h-12 border-[color:#1E2D45] bg-[color:#1C2537] text-[color:#F0F4FF] placeholder:text-[color:#4A5568]"
            />
          </form>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {quickProducts.slice(0, 3).map((product, index) => (
              <button
                key={product.id || product.barcode}
                onClick={() => {
                  setBarcodeInput(product.barcode);
                  void processBarcode(product.barcode);
                }}
                className="rounded-xl border border-[color:#1E2D45] bg-[color:#111827] p-3 text-left"
              >
                <p className="truncate text-[10px] font-bold text-[color:#F0F4FF]">{product.name || `Product ${index + 1}`}</p>
                <p className="mt-1 text-[9px] font-mono text-[color:#8B95B0]">{product.barcode}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button onClick={stopSession} disabled={stoppingSession || sessionBusy} variant="destructive" className="h-11 rounded-[14px] px-4">
              {stoppingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Stop session
            </Button>
            <div className="text-right text-[11px] text-[color:#8B95B0]">
              <p className="font-bold text-primary">{itemCount} items in cart</p>
              <p>Session active</p>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("fixed inset-x-0 bottom-0 z-40 translate-y-full transition-transform duration-300 ease-out", scannedProduct && "translate-y-0")}>
        <div className="rounded-t-[22px] border-t border-[color:#1E2D45] bg-[color:#111827] px-5 pb-8 pt-3">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[color:#1E2D45]" />
          {scannedProduct ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[color:#1C2537] text-3xl">{selectedEmoji}</div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[color:#F0F4FF]">{scannedProduct.name}</h3>
                    <p className="mt-1 text-[11px] text-[color:#8B95B0]">Category · Brand</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[20px] font-extrabold text-primary">{formatCurrency(Number(scannedProduct.price || 0))}</span>
                      {scannedProduct.offer?.discountPercent ? <span className="text-[12px] text-[color:#4A5568] line-through">{formatCurrency(Math.round((Number(scannedProduct.price || 0) * 100) / (100 - Number(scannedProduct.offer.discountPercent))))}</span> : null}
                    </div>
                  </div>
                </div>
                <button onClick={resumeScanner} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:#1C2537] text-[color:#8B95B0]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {scannedProduct.offer?.discountPercent ? (
                <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[color:#7C3AED55] bg-[color:#7C3AED18] px-3 py-2 text-[11px] text-[#A78BFA]">
                  <Tag className="h-4 w-4" />
                  <span>{scannedProduct.offer.discountPercent}% off — Buy today, save more</span>
                </div>
              ) : null}

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[color:#1C2537] p-3 text-center"><p className="text-[14px] font-bold">{scannedProduct.calories || 0}</p><p className="text-[9px] uppercase tracking-[0.08em] text-[color:#8B95B0]">Calories</p></div>
                <div className="rounded-xl bg-[color:#1C2537] p-3 text-center"><p className="text-[14px] font-bold">3.5g</p><p className="text-[9px] uppercase tracking-[0.08em] text-[color:#8B95B0]">Fat</p></div>
                <div className="rounded-xl bg-[color:#1C2537] p-3 text-center"><p className="text-[14px] font-bold">3.4g</p><p className="text-[9px] uppercase tracking-[0.08em] text-[color:#8B95B0]">Protein</p></div>
              </div>

              {(scannedProduct.allergens || []).length > 0 ? (
                <div className="mb-5 flex flex-wrap gap-2">
                  {scannedProduct.allergens.map((allergen: string) => {
                    const isUnsafe = matchingAllergens.includes(allergen.toLowerCase());
                    return (
                      <div key={allergen} className={cn("rounded-lg border px-3 py-2 text-[10px] font-bold", isUnsafe ? "border-[#FF475744] bg-[#FF475718] text-[#FF4757]" : "border-primary/30 bg-primary/10 text-primary")}>
                        {isUnsafe ? <span className="mr-1 inline-block"><AlertTriangle className="inline h-3 w-3" /></span> : null}
                        {allergen}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <Button onClick={() => void addProductToCart(scannedProduct, true)} className="h-12 w-full rounded-[14px] bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> Add to cart
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <BottomNav cartCount={itemCount} />
    </div>
  );
}
