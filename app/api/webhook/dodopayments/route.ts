import { Webhooks } from "@dodopayments/nextjs";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const webhookKey = process.env.DODO_WEBHOOK_SECRET;

if (!webhookKey) {
  throw new Error("DODO_WEBHOOK_SECRET is not configured. Webhook verification will fail without it.");
}

export const POST = Webhooks({
  webhookKey: webhookKey,
  onPaymentSucceeded: async (event: any) => {
    console.log("DODO_WEBHOOK: Payment Succeeded", { 
      session_id: event.data.session_id,
      payment_id: event.data.payment_id,
      user_id: event.data.metadata?.user_id 
    });
    
    const userId = event.data.metadata?.user_id;
    if (!userId) {
      console.error("DODO_WEBHOOK: Missing user_id in payment metadata");
      return;
    }

    const supabase = createSupabaseAdmin();
    
    // 1. Record transaction
    const { error: insertError } = await supabase.from("transactions").upsert({
      user_id: userId,
      dodo_session_id: event.data.payment_id || event.data.session_id,
      amount: event.data.total_amount / 100,
      currency: event.data.currency,
      status: "completed",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("DODO_WEBHOOK: Failed to insert transaction", insertError);
    }

    // 2. Update user tier in profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tier: "pro" })
      .eq("id", userId);

    if (updateError) {
      console.error("DODO_WEBHOOK: Failed to update profile tier to pro", updateError);
      throw updateError;
    }
    
    console.log(`DODO_WEBHOOK: Successfully upgraded user ${userId} to pro`);
  },
  onSubscriptionActive: async (event: any) => {
    console.log("DODO_WEBHOOK: Subscription Active", { 
      subscription_id: event.data.subscription_id,
      user_id: event.data.metadata?.user_id 
    });
    
    const userId = event.data.metadata?.user_id;
    if (!userId) {
      console.error("DODO_WEBHOOK: Missing user_id in subscription metadata");
      return;
    }

    const supabase = createSupabaseAdmin();

    // 1. Record/Update transaction status
    const { error: insertError } = await supabase.from("transactions").upsert({
      user_id: userId,
      dodo_session_id: event.data.subscription_id, 
      amount: event.data.total_amount ? event.data.total_amount / 100 : null,
      currency: event.data.currency,
      status: "active",
      metadata: event.data
    }, { onConflict: 'dodo_session_id' });

    if (insertError) {
      console.error("DODO_WEBHOOK: Failed to upsert subscription transaction", insertError);
    }
    
    // 2. Update user tier in profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tier: "pro" })
      .eq("id", userId);

    if (updateError) {
      console.error("DODO_WEBHOOK: Failed to update profile tier on subscription active", updateError);
      throw updateError;
    }

    console.log(`DODO_WEBHOOK: Successfully activated pro tier for user ${userId}`);
  }
} as any);
