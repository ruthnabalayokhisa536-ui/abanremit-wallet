// Airtime Callback Handler for Instalipa
// Handles airtime purchase callbacks and updates transaction status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface AirtimeCallbackPayload {
  transactionId?: string;
  requestId?: string;
  status?: string;
  phoneNumber?: string;
  amount?: number;
  network?: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
  reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback payload
    const payload: AirtimeCallbackPayload = await req.json();
    
    console.log("Airtime callback received:", payload);

    // Extract transaction reference
    const reference = payload.transactionId || payload.requestId || payload.reference;
    
    if (!reference) {
      console.error("No transaction reference in callback");
      return new Response(
        JSON.stringify({ success: false, message: "No transaction reference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find the airtime transaction
    const { data: airtimeTx, error: findError } = await supabase
      .from("airtime_transactions")
      .select("*, wallets!inner(id, user_id, balance, wallet_id)")
      .eq("transaction_id", reference)
      .single();

    if (findError || !airtimeTx) {
      console.error("Airtime transaction not found:", reference);
      return new Response(
        JSON.stringify({ success: false, message: "Transaction not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if already processed (idempotency)
    if (airtimeTx.status === "completed" || airtimeTx.status === "failed") {
      console.log(`Transaction ${reference} already processed with status: ${airtimeTx.status}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Callback already processed",
          status: airtimeTx.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine status from callback
    let newStatus = "pending";
    let resultMessage = payload.message || "";

    if (payload.status) {
      const status = payload.status.toLowerCase();
      if (status === "success" || status === "completed" || status === "sent") {
        newStatus = "completed";
      } else if (status === "failed" || status === "error") {
        newStatus = "failed";
        resultMessage = payload.errorMessage || payload.message || "Airtime purchase failed";
      }
    }

    // Update airtime transaction and wallet transaction
    const { error: updateError } = await supabase
      .from("airtime_transactions")
      .update({
        status: newStatus,
        result_message: resultMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", airtimeTx.id);

    if (updateError) {
      console.error("Error updating airtime transaction:", updateError);
      throw updateError;
    }

    // Update wallet transaction status
    await supabase
      .from("transactions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference)
      .eq("type", "airtime");

    // If failed, refund the user's wallet
    if (newStatus === "failed") {
      console.log("Airtime purchase failed, refunding wallet...");

      // Get the original wallet transaction
      const { data: walletTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("reference", reference)
        .eq("type", "airtime")
        .single();

      if (walletTx) {
        // Get user's wallet
        const { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", airtimeTx.user_id)
          .single();

        if (wallet) {
          // Refund amount + fee
          const refundAmount = Math.abs(airtimeTx.amount) + (airtimeTx.fee || 0);
          const newBalance = wallet.balance + refundAmount;

          // Update wallet balance atomically
          await supabase
            .from("wallets")
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id);

          // Create refund transaction with metadata preserved
          await supabase
            .from("transactions")
            .insert({
              sender_wallet_id: wallet.id,
              type: "refund",
              amount: refundAmount,
              balance_after: newBalance,
              metadata: walletTx.metadata,
              reference: `REFUND-${reference}`,
              status: "completed",
            });

          // Send failure notification
          await supabase
            .from("notifications")
            .insert({
              user_id: wallet.user_id,
              title: "Airtime Purchase Failed",
              message: `Your airtime purchase failed and ${refundAmount} KES has been refunded to your wallet. Reason: ${resultMessage}`,
              type: "transaction",
              priority: "high",
            });

          console.log(`Refunded ${refundAmount} KES to wallet ${wallet.wallet_id}`);
        }
      }
    }

    // If successful, send success notification
    if (newStatus === "completed") {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("user_id")
        .eq("user_id", airtimeTx.user_id)
        .single();

      if (wallet) {
        // Get network name from metadata
        const { data: walletTx } = await supabase
          .from("transactions")
          .select("metadata")
          .eq("reference", reference)
          .eq("type", "airtime")
          .single();

        const networkName = walletTx?.metadata?.network || "Unknown";

        await supabase
          .from("notifications")
          .insert({
            user_id: wallet.user_id,
            title: "Airtime Purchase Successful",
            message: `Successfully purchased ${airtimeTx.amount} KES airtime for ${airtimeTx.phone_number} (${networkName})`,
            type: "transaction",
            priority: "normal",
          });
      }
    }

    console.log(`Airtime transaction ${reference} updated to ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Callback processed successfully",
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Airtime callback error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Internal server error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
