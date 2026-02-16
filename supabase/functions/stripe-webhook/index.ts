import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Stripe webhook event:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const walletId = session.metadata?.walletId;
      const amount = parseFloat(session.metadata?.amount || "0");

      if (!userId || !walletId || !amount) {
        console.error("Missing metadata in session:", session.id);
        return new Response("Missing metadata", { status: 400 });
      }

      // Update transaction status
      const { error: updateError } = await supabaseClient
        .from("stripe_transactions")
        .update({
          status: "completed",
          payment_intent: session.payment_intent as string,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", session.id);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      }

      // Credit wallet
      const { error: walletError } = await supabaseClient.rpc("credit_wallet", {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_type: "deposit",
        p_description: `Card deposit - Stripe ${session.id}`,
        p_reference: session.payment_intent as string,
      });

      if (walletError) {
        console.error("Error crediting wallet:", walletError);
        return new Response("Error crediting wallet", { status: 500 });
      }

      console.log(`Wallet credited: ${amount} KES for user ${userId}`);

      // Send notification
      await supabaseClient.from("notifications").insert({
        user_id: userId,
        title: "Deposit Successful",
        message: `Your card deposit of KES ${amount} has been credited to your wallet.`,
        type: "transaction",
        priority: "high",
      });
    }

    // Handle failed payment
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Update transaction status
      await supabaseClient
        .from("stripe_transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", session.id);

      console.log(`Payment failed for session: ${session.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
