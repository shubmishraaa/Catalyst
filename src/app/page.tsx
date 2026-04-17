"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, LayoutDashboard, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-6xl font-bold text-primary mb-2">Catalyst</h1>
        <p className="text-xl text-muted-foreground">Checkout without the queue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link href="/login">
          <Card className="group hover:border-primary transition-all duration-300 cursor-pointer overflow-hidden h-full border-none shadow-sm">
            <CardHeader className="bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <div className="mb-4 text-primary bg-primary/20 w-fit p-3 rounded-2xl">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Shopper App</CardTitle>
              <CardDescription>Experience the future of grocery shopping. Scan and go!</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full rounded-xl h-12 shadow-md shadow-primary/20">Enter Shopper Mode</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/login">
          <Card className="group hover:border-accent transition-all duration-300 cursor-pointer overflow-hidden h-full border-none shadow-sm">
            <CardHeader className="bg-accent/5 group-hover:bg-accent/10 transition-colors">
              <div className="mb-4 text-accent bg-accent/20 w-fit p-3 rounded-2xl">
                <LayoutDashboard className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
              <CardDescription>Monitor live sessions, track revenue, and manage store operations.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button variant="secondary" className="w-full rounded-xl h-12">Enter Dashboard</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="mt-12 text-sm text-muted-foreground opacity-50">
        Authentication Gateway Ready
      </div>
    </div>
  );
}
