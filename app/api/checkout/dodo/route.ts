import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { dodo } from "@/lib/dodo";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    const body = await req.json();
    const productId = body.productId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Create a checkout session with the correct structure
    const session = await dodo.checkoutSessions.create({
      product_cart: [{
        product_id: productId,
        quantity: 1,
      }],
      customer: {
        email: user?.primaryEmailAddress?.emailAddress || "",
      },
      metadata: {
        clerk_id: userId,
      },
    });

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (error: any) {
    console.error("Dodo Session Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
