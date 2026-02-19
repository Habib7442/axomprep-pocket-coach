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
    console.log("Dodo Webhook: Payment Succeeded", { session_id: event.data.session_id });
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("Dodo Webhook: Missing clerk_id in payment metadata", { session_id: event.data.session_id });
      return;
    }

    const supabase = createSupabaseAdmin();
    
    // 1. Atomic Upsert for idempotency and racing prevention
    const { error: insertError } = await supabase.from("transactions").upsert({
      clerk_id: clerkId,
      dodo_session_id: event.data.session_id,
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "completed",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("Dodo Webhook: Failed to process transaction", insertError);
      throw insertError;
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
  },
  onSubscriptionActive: async (event: any) => {
    console.log("Dodo Webhook: Subscription Active", { subscription_id: event.data.subscription_id });
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("Dodo Webhook: Missing clerk_id in subscription metadata", { subscription_id: event.data.subscription_id });
      return;
    }

    const supabase = createSupabaseAdmin();

    // 1. Atomic Upsert for idempotency and racing prevention
    const { error: insertError } = await supabase.from("transactions").upsert({
      clerk_id: clerkId,
      dodo_session_id: event.data.subscription_id, 
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "active",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("Dodo Webhook: Failed to process transaction", insertError);
      throw insertError;
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
  }
} as any);
