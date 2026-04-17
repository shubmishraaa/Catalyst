"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";

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
    const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() })));
    });
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

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      toast({ title: "Product deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h2 className="text-3xl font-bold">Product Catalog</h2>
        <p className="text-muted-foreground">Manage inventory, allergens, and active offers.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 border-none shadow-sm bg-card border border-border h-fit">
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>Scanner data for the mobile app.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Organic Bananas" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Price (Rs.)</label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="e.g. 50" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Barcode (EAN/UPC)</label>
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} required placeholder="e.g. 89010309111" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Calories</label>
                <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="e.g. 120" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Allergens (comma separated)</label>
                <Input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="e.g. dairy, nuts" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Offer Discount %</label>
                <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="e.g. 10" className="h-12 rounded-xl bg-muted/20" />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold mt-4 shadow-xl shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Product"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2 border-none shadow-sm overflow-hidden bg-card border border-border">
          <Table>
            <TableHeader className="bg-muted/50 border-b-border">
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No products found in the catalog.</TableCell>
                </TableRow>
              )}
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-medium text-muted-foreground">{product.barcode}</TableCell>
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell>Rs. {product.price}</TableCell>
                  <TableCell>{product.offer?.discountPercent ? `${product.offer.discountPercent}% off` : "None"}</TableCell>
                  <TableCell>{product.calories} kcal</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
