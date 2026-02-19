import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { dodo } from "@/lib/dodo";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    const body = await req.json();
    const productId = body.productId;
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
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
        clerk_id: userId,
      },
    });

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (error: unknown) {
    console.error("Dodo Session Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
