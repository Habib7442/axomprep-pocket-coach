import { NextResponse } from "next/server";
import { dodo } from "@/lib/dodo";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const productId = body.productId || process.env.NEXT_PUBLIC_DODO_PRODUCT_ID;
    const email = user.email;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is missing in request and env" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 });
    }

    // Create a checkout session with the correct structure
    const session = await dodo.checkoutSessions.create({
      product_cart: [{
        product_id: productId,
        quantity: 1,
      }],
      customer: {
        email,
      },
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (error: any) {
    console.error("Dodo Session Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
