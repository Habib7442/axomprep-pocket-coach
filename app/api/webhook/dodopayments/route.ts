import { Webhooks } from "@dodopayments/nextjs";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const webhookKey = process.env.DODO_WEBHOOK_SECRET;

if (!webhookKey) {
  throw new Error("DODO_WEBHOOK_SECRET is not configured. Webhook verification will fail without it.");
}

export const POST = Webhooks({
  webhookKey: webhookKey,
  // Webhook adaptor expects event handlers
  // The official adaptor uses 'on' prefix for events
  onPaymentSucceeded: async (event: any) => {
    console.log("Dodo Webhook: Payment Succeeded", event);
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("Dodo Webhook: Missing clerk_id in payment metadata", event.data);
      return;
    }

    const supabase = createSupabaseAdmin();
    
    // 1. Idempotency check: Check if this session was already processed
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("dodo_session_id", event.data.session_id)
      .single();
    
    if (existing) {
      console.log("Dodo Webhook: Payment already processed", event.data.session_id);
      return;
    }

    // 2. Update user tier
    const { error: updateError } = await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    if (updateError) {
      console.error("Dodo Webhook: Failed to update user tier", updateError);
      throw updateError; // Rethrow to signal failure to Dodo for retries
    }

    // 3. Save transaction record
    const { error: insertError } = await supabase.from("transactions").insert({
      clerk_id: clerkId,
      dodo_session_id: event.data.session_id,
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "completed",
      metadata: event.data
    });

    if (insertError) {
      console.error("Dodo Webhook: Failed to insert transaction", insertError);
      throw insertError;
    }
  },
  onSubscriptionActive: async (event: any) => {
    console.log("Dodo Webhook: Subscription Active", event);
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("Dodo Webhook: Missing clerk_id in subscription metadata", event.data);
      return;
    }

    const supabase = createSupabaseAdmin();

    // 1. Idempotency check: Check if this subscription was already processed
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("dodo_session_id", event.data.subscription_id)
      .single();
    
    if (existing) {
      console.log("Dodo Webhook: Subscription already processed", event.data.subscription_id);
      return;
    }
    
    // 2. Update user tier
    const { error: updateError } = await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    if (updateError) {
      console.error("Dodo Webhook: Failed to update user tier", updateError);
      throw updateError;
    }

    // 3. Save transaction record
    const { error: insertError } = await supabase.from("transactions").insert({
      clerk_id: clerkId,
      dodo_session_id: event.data.subscription_id, 
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "active",
      metadata: event.data
    });

    if (insertError) {
      console.error("Dodo Webhook: Failed to insert transaction", insertError);
      throw insertError;
    }
  }
} as any);
