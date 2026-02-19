"use client";

import { useEffect, useState } from "react";
import { DodoPayments } from "dodopayments-checkout";
import { toast } from "sonner";

interface PricingButtonProps {
  productId: string;
  email?: string;
}

export default function PricingButton({ productId, email }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize Overlay
    DodoPayments.Initialize({
      mode: process.env.NODE_ENV === "production" ? "live" : "test",
      displayType: "overlay",
      onEvent: (event) => {
        console.log("Dodo Event:", event);
        // Based on Dodo docs, status update is a good indicator
        if (event.event_type === "checkout.status") {
          const status = (event.data as any)?.status;
          if (status === "succeeded" || status === "completed") {
             toast.success("Payment successful! Access granted.");
             window.location.href = "/dashboard";
          }
        }
      },
    });
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/checkout/dodo", {
        method: "POST",
        body: JSON.stringify({ productId, email }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Open Overlay using the checkoutUrl (payment_link)
      DodoPayments.Checkout.open({
        checkoutUrl: data.checkoutUrl,
      });
    } catch (error: any) {
      console.error("Checkout failed:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout}
      disabled={loading}
      className="w-full md:w-auto px-16 py-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/30 disabled:opacity-50"
    >
      {loading ? "Preparing..." : "Join Prep Pass"}
    </button>
  );
}
