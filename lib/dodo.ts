import DodoPayments from "dodopayments";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
  console.warn("DODO_PAYMENTS_API_KEY is not configured - payment features will not work");
}

export const dodo = new DodoPayments({
  bearerToken: apiKey ?? "",
  environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

/**
 * Creates a checkout session for the ₹199 plan
 */
export async function createDodoCheckout(customerId?: string, email?: string) {
  const productId = process.env.DODO_PRODUCT_ID;
  
  if (!productId) {
    throw new Error("DODO_PRODUCT_ID is not configured");
  }

  try {
    const session = await dodo.checkoutSessions.create({
      product_cart: [{
        product_id: productId,
        quantity: 1,
      }],
      customer: customerId ? { customer_id: customerId } : (email ? { email } : undefined),
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
    });
    return session;
  } catch (error) {
    console.error("Dodo Checkout Error:", error);
    throw error;
  }
}
