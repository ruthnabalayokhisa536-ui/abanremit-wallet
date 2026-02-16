// Paystack Callback Handler
// Handles payment verification after redirect

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get reference from URL query params
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, message: "No reference provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Verifying Paystack payment:", reference);

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!verifyResponse.ok) {
      throw new Error(`Paystack verification failed: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    console.log("Paystack verification response:", verifyData);

    if (!verifyData.status || !verifyData.data) {
      throw new Error("Invalid verification response");
    }

    const paymentData = verifyData.data;

    // Find transaction in database
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
        JSON.stringify({ 
          success: true, 
          message: "Payment already processed",
          redirect: "/dashboard?payment=success"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment status
    if (paymentData.status !== "success") {
      // Update transaction as failed
      await supabase
        .from("paystack_transactions")
        .update({
          status: "failed",
          gateway_response: paymentData.gateway_response,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Payment failed",
          redirect: "/dashboard?payment=failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches
    const amountPaid = paymentData.amount / 100; // Paystack uses kobo
    if (Math.abs(amountPaid - transaction.amount) > 0.01) {
      console.error("Amount mismatch:", { expected: transaction.amount, received: amountPaid });
      throw new Error("Amount mismatch");
    }

    // Credit user's wallet
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
    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (updateError) {
      throw updateError;
    }

    // Update transaction status
    await supabase
      .from("paystack_transactions")
      .update({
        status: "completed",
        gateway_response: paymentData.gateway_response,
        paid_at: paymentData.paid_at,
        channel: paymentData.channel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // Create wallet transaction record
    await supabase
      .from("transactions")
      .insert({
        user_id: transaction.user_id,
        wallet_id: wallet.id,
        type: "deposit",
        amount: transaction.amount,
        balance_after: newBalance,
        description: `Paystack deposit - ${paymentData.channel}`,
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

    console.log(`Wallet credited: ${transaction.amount} KES to wallet ${wallet.wallet_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment successful",
        amount: transaction.amount,
        redirect: "/dashboard?payment=success"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Paystack callback error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Internal server error",
        redirect: "/dashboard?payment=error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
