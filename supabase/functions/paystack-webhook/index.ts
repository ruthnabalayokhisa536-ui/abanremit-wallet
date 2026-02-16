// Paystack Webhook Handler
// Handles real-time payment notifications from Paystack

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get signature from headers
    const signature = req.headers.get("x-paystack-signature");
    
    // Get raw body
    const body = await req.text();
    
    // Verify webhook signature
    if (signature) {
      const hash = createHmac("sha512", paystackSecretKey)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ success: false, message: "Invalid signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    // Handle different event types
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      console.log("Processing successful charge:", reference);

      // Find transaction
      const { data: transaction, error: findError } = await supabase
        .from("paystack_transactions")
        .select("*")
        .eq("reference", reference)
        .single();

      if (findError || !transaction) {
        console.error("Transaction not found:", reference);
        return new Response(
          JSON.stringify({ success: false, message: "Transaction not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Check if already processed
      if (transaction.status === "completed") {
        console.log("Transaction already processed:", reference);
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify amount
      const amountPaid = data.amount / 100; // Convert from kobo
      if (Math.abs(amountPaid - transaction.amount) > 0.01) {
        console.error("Amount mismatch:", { expected: transaction.amount, received: amountPaid });
        throw new Error("Amount mismatch");
      }

      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", transaction.wallet_id)
        .single();

      if (walletError || !wallet) {
        throw new Error("Wallet not found");
      }

      const newBalance = wallet.balance + transaction.amount;

      // Update wallet balance
      await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      // Update transaction
      await supabase
        .from("paystack_transactions")
        .update({
          status: "completed",
          gateway_response: data.gateway_response,
          paid_at: data.paid_at,
          channel: data.channel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // Create wallet transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: transaction.user_id,
          wallet_id: wallet.id,
          type: "deposit",
          amount: transaction.amount,
          balance_after: newBalance,
          description: `Paystack deposit - ${data.channel}`,
          reference: reference,
          status: "completed",
        });

      // Send notification
      await supabase
        .from("notifications")
        .insert({
          user_id: transaction.user_id,
          title: "Deposit Successful",
          message: `Your wallet has been credited with KES ${transaction.amount.toFixed(2)}`,
          type: "transaction",
          priority: "high",
        });

      console.log(`Wallet credited via webhook: ${transaction.amount} KES`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
