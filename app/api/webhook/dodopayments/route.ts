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
    console.log("DODO_WEBHOOK: Payment Succeeded", { 
      session_id: event.data.session_id,
      payment_id: event.data.payment_id,
      clerk_id: event.data.metadata?.clerk_id 
    });
    
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("DODO_WEBHOOK: Missing clerk_id in payment metadata");
      return;
    }

    const supabase = createSupabaseAdmin();
    
    // 1. Record transaction
    const { error: insertError } = await supabase.from("transactions").upsert({
      clerk_id: clerkId,
      dodo_session_id: event.data.payment_id || event.data.session_id,
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "completed",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("DODO_WEBHOOK: Failed to insert transaction", insertError);
    }

    // 2. Update user tier
    const { error: updateError } = await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    if (updateError) {
      console.error("DODO_WEBHOOK: Failed to update user tier to pro", updateError);
      throw updateError;
    }
    
    console.log(`DODO_WEBHOOK: Successfully upgraded user ${clerkId} to pro`);
  },
  onSubscriptionActive: async (event: any) => {
    console.log("DODO_WEBHOOK: Subscription Active", { 
      subscription_id: event.data.subscription_id,
      clerk_id: event.data.metadata?.clerk_id 
    });
    
    const clerkId = event.data.metadata?.clerk_id;
    if (!clerkId) {
      console.error("DODO_WEBHOOK: Missing clerk_id in subscription metadata");
      return;
    }

    const supabase = createSupabaseAdmin();

    // 1. Record/Update transaction status
    const { error: insertError } = await supabase.from("transactions").upsert({
      clerk_id: clerkId,
      dodo_session_id: event.data.subscription_id, 
      amount: event.data.total_amount ? event.data.total_amount / 100 : null,
      currency: event.data.currency,
      status: "active",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("DODO_WEBHOOK: Failed to upsert subscription transaction", insertError);
    }
    
    // 2. Update user tier
    const { error: updateError } = await supabase
      .from("users")
      .update({ tier: "pro" })
      .eq("clerk_id", clerkId);

    if (updateError) {
      console.error("DODO_WEBHOOK: Failed to update user tier on subscription active", updateError);
      throw updateError;
    }

    console.log(`DODO_WEBHOOK: Successfully activated pro tier for user ${clerkId}`);
  }
} as any);
