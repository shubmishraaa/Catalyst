"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { formatCurrency } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [calories, setCalories] = useState("");
  const [allergens, setAllergens] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  useEffect(() => {
    const seedDemoProducts = async () => {
      await Promise.all(DEMO_PRODUCTS.map((product) => setDoc(doc(db, "products", product.id), {
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        calories: product.calories,
        allergens: product.allergens,
        offer: product.offer,
        image: product.image,
      }, { merge: true })));
    };
    void seedDemoProducts();
    const unsub = onSnapshot(collection(db, "products"), (snapshot) => setProducts(snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }))));
    return () => unsub();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        barcode,
        calories: Number(calories) || 0,
        allergens: allergens ? allergens.split(",").map((allergen) => allergen.trim().toLowerCase()) : [],
        offer: Number(discountPercent) > 0 ? { discountPercent: Number(discountPercent) } : null,
      });
      toast({ title: "Product added successfully" });
      setName("");
      setPrice("");
      setBarcode("");
      setCalories("");
      setAllergens("");
      setDiscountPercent("");
    } catch (err: any) {
      toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#64748b]">Products</p>
        <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.4px]">Product catalog</h2>
      </header>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <form onSubmit={handleAddProduct} className="admin-card space-y-3 p-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Product name" />
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Price" />
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} required placeholder="Barcode" />
          <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" />
          <Input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="Allergens" />
          <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="Discount %" />
          <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-[14px] bg-primary text-primary-foreground">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save product"}
          </Button>
        </form>
        <div className="admin-card overflow-hidden">
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-[1fr_1.1fr_0.8fr_auto] gap-3 border-b border-[color:#f1f5f9] px-4 py-3 text-[12px] last:border-b-0">
              <span className="truncate font-mono">{product.barcode}</span>
              <span className="truncate font-bold">{product.name}</span>
              <span>{formatCurrency(Number(product.price || 0))}</span>
              <button onClick={() => deleteDoc(doc(db, "products", product.id))} className="text-[#ff4757]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
