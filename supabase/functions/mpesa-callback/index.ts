import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("M-Pesa Callback Received:", JSON.stringify(payload, null, 2));

    const {
      Body: {
        stkCallback: {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata,
        },
      },
    } = payload;

    // Extract callback metadata
    let amount = 0;
    let mpesaReceiptNumber = "";
    let transactionDate = "";
    let phoneNumber = "";

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "Amount") amount = item.Value;
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
        if (item.Name === "TransactionDate") transactionDate = item.Value;
        if (item.Name === "PhoneNumber") phoneNumber = item.Value;
      }
    }

    console.log(`Processing callback - CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    // Update M-Pesa transaction record
    const { data: transaction, error: updateError } = await supabase
      .from("mpesa_transactions")
      .update({
        result_code: ResultCode,
        result_desc: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        transaction_date: transactionDate,
        status: ResultCode === 0 ? "completed" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating M-Pesa transaction:", updateError);
      throw updateError;
    }

    console.log("M-Pesa transaction updated:", transaction);
    console.log(`Status: ${transaction.status}, Amount: ${amount}, Receipt: ${mpesaReceiptNumber}`);

    // The database trigger will automatically credit the wallet!
    // No need to call credit_wallet manually

    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Success",
        message: "Callback processed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return new Response(
      JSON.stringify({
        ResultCode: 1,
        ResultDesc: "Failed",
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
