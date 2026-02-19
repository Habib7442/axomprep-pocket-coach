import { Webhooks } from "@dodopayments/nextjs";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const POST = Webhooks({
  webhookKey: process.env.DODO_WEBHOOK_SECRET || "",
  // Webhook adaptor expects event handlers
  // The official adaptor uses 'on' prefix for events
  onPaymentSucceeded: async (event: any) => {
    console.log("Dodo Webhook: Payment Succeeded", event);
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) return;

    const supabase = createSupabaseAdmin();
    
    // Update user tier
    await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    // Save transaction
    await supabase.from("transactions").insert({
      clerk_id: clerkId,
      dodo_session_id: event.data.session_id,
      amount: event.data.total_amount / 100, // Assuming Dodo sends in cents
      currency: event.data.currency,
      status: "completed",
      metadata: event.data
    });
  },
  onSubscriptionActive: async (event: any) => {
    console.log("Dodo Webhook: Subscription Active", event);
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) return;

    const supabase = createSupabaseAdmin();
    
    // Update user tier
    await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    // Save transaction
    await supabase.from("transactions").insert({
      clerk_id: clerkId,
      dodo_session_id: event.data.subscription_id, // For subscriptions
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "active",
      metadata: event.data
    });
  }
} as any);
