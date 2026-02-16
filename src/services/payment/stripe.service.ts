import { supabase } from "@/integrations/supabase/client";

interface StripePayment {
  amount: number;
  description: string;
  email: string;
}

interface StripeResponse {
  status: "pending" | "failed";
  message: string;
  clientSecret?: string;
  demo?: boolean;
}

export const stripeService = {
  /**
   * Create Stripe payment intent
   */
  async createPaymentIntent(payment: StripePayment): Promise<StripeResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      // Check if Stripe keys are configured
      if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY || !import.meta.env.VITE_STRIPE_SECRET_KEY) {
        return {
          status: "pending",
          message: "Stripe not configured (ready for setup)",
          demo: true,
        };
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payments/stripe/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: payment.amount,
          description: payment.description,
          email: payment.email,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Stripe payment intent error:", error);
      return {
        status: "failed",
        message: "Failed to create payment intent",
      };
    }
  },

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!(
      import.meta.env.VITE_STRIPE_PUBLIC_KEY &&
      import.meta.env.VITE_STRIPE_SECRET_KEY
    );
  },

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    configured: boolean;
    message: string;
  } {
    if (this.isConfigured()) {
      return {
        configured: true,
        message: "Stripe is configured and ready",
      };
    }

    return {
      configured: false,
      message: "Stripe is not configured. See setup instructions in Payment Gateway Integration Guide.",
    };
  },
};
