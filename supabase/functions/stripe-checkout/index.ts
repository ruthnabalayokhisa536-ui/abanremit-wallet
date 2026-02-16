import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe configuration
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

interface CheckoutRequest {
  amount: number;
  userId: string;
  walletId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request data
    const requestData: CheckoutRequest = await req.json();

    // Validate request
    if (!requestData.amount || !requestData.userId || !requestData.walletId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount
    if (requestData.amount < 1 || requestData.amount > 150000) {
      return new Response(
        JSON.stringify({ success: false, error: "Amount must be between 1 and 150,000 KES" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get success and cancel URLs
    const baseUrl = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:8081";
    const successUrl = `${baseUrl}/dashboard/deposit?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/dashboard/deposit?canceled=true`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "kes",
            product_data: {
              name: "Wallet Deposit",
              description: `Deposit to AbanRemit Wallet`,
            },
            unit_amount: Math.round(requestData.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: requestData.userId,
        walletId: requestData.walletId,
        amount: requestData.amount.toString(),
        type: "wallet_deposit",
      },
      customer_email: undefined, // Optional: can add user email
    });

    // Save pending transaction to database
    const { error: dbError } = await supabaseClient
      .from("stripe_transactions")
      .insert({
        user_id: requestData.userId,
        wallet_id: requestData.walletId,
        session_id: session.id,
        amount: requestData.amount,
        currency: "kes",
        status: "pending",
      });

    if (dbError) {
      console.error("Error saving transaction:", dbError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
        sessionId: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
