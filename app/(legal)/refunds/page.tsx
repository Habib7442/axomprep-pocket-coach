"use client";

import { LegalWrapper } from "@/components/LegalWrapper";

export default function RefundPage() {
  return (
    <LegalWrapper title="Refund & Cancellation" lastUpdated="February 19, 2026">
      <h2>1. Premium Subscriptions</h2>
      <p>
        Axomprep offers both Free and Premium tiers. Premium tiers grant access to advanced AI features, 
        unlimited voice coaching, and specialized exam prediction tools.
      </p>

      <h2>2. Refund Eligibility</h2>
      <p>
        Since we provide digital services with immediate value (AI processing), refunds are generally 
        not provided once the premium features have been significantly used. However, if you experience 
        technical issues preventing access to the service within the first 48 hours of purchase, 
        you may request a refund.
      </p>

      <h2>3. Cancellation</h2>
      <p>
        You can cancel your subscription at any time through your dashboard. Your access to premium features 
        will continue until the end of your current billing cycle.
      </p>

      <h2>4. Processing Refunds</h2>
      <p>
        Approved refunds will be processed back to your original payment method within 5-7 working days. 
        Please contact support@axomprep.in for any payment-related queries.
      </p>
    </LegalWrapper>
  );
}
