import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MPesaSTKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  userId: string;
}

interface MPesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

// M-Pesa Production Credentials
const MPESA_CONSUMER_KEY = "QwzCGC1fTPluVAXeNjxFTTDXsjklVKeL";
const MPESA_CONSUMER_SECRET = "6Uc2GeVcZBUGWHGT";
const MPESA_SHORTCODE = "000772";
const MPESA_PASSKEY = "b309881157d87125c7f87ffffde6448ab10f90e3dce7c4d8efab190482896018";
const MPESA_API_URL = "https://api.safaricom.co.ke";

/**
 * Get M-Pesa OAuth Access Token
 */
async function getAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  
  const response = await fetch(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Generate M-Pesa Password
 */
function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  return { password, timestamp };
}

/**
 * Format phone number to M-Pesa format (254XXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  } else if (cleaned.startsWith("+254")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("254")) {
    // Already in correct format
  } else if (cleaned.length === 9) {
    cleaned = "254" + cleaned;
  }
  
  return cleaned;
}

/**
 * Initiate M-Pesa STK Push
 */
async function initiateSTKPush(request: MPesaSTKPushRequest): Promise<any> {
  const accessToken = await getAccessToken();
  const { password, timestamp } = generatePassword();
  const phoneNumber = formatPhoneNumber(request.phoneNumber);
  
  // Get callback URL from environment or use default
  const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || 
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-api/callback`;

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(request.amount), // M-Pesa requires integer
    PartyA: phoneNumber,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: request.accountReference,
    TransactionDesc: request.transactionDesc,
  };

  console.log("STK Push Request:", { ...payload, Password: "***" });

  const response = await fetch(`${MPESA_API_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("STK Push Response:", data);

  if (!response.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK Push failed");
  }

  return data;
}

/**
 * Handle M-Pesa Callback
 */
async function handleCallback(callbackData: MPesaCallbackData, supabase: any): Promise<void> {
  const { stkCallback } = callbackData.Body;
  
  console.log("M-Pesa Callback Received:", stkCallback);

  const isSuccessful = stkCallback.ResultCode === 0;
  
  // Extract callback metadata
  let mpesaReceiptNumber = "";
  let amount = 0;
  let phoneNumber = "";
  let transactionDate = "";

  if (isSuccessful && stkCallback.CallbackMetadata) {
    for (const item of stkCallback.CallbackMetadata.Item) {
      switch (item.Name) {
        case "MpesaReceiptNumber":
          mpesaReceiptNumber = String(item.Value);
          break;
        case "Amount":
          amount = Number(item.Value);
          break;
        case "PhoneNumber":
          phoneNumber = String(item.Value);
          break;
        case "TransactionDate":
          transactionDate = String(item.Value);
          break;
      }
    }
  }

  // Update transaction in database
  const { error: updateError } = await supabase
    .from("mpesa_transactions")
    .update({
      result_code: stkCallback.ResultCode,
      result_desc: stkCallback.ResultDesc,
      mpesa_receipt_number: mpesaReceiptNumber,
      transaction_date: transactionDate,
      status: isSuccessful ? "completed" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", stkCallback.CheckoutRequestID);

  if (updateError) {
    console.error("Error updating transaction:", updateError);
    throw updateError;
  }

  // If successful, credit user wallet
  if (isSuccessful) {
    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from("mpesa_transactions")
      .select("user_id, amount")
      .eq("checkout_request_id", stkCallback.CheckoutRequestID)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
      return;
    }

    // Credit wallet
    const { error: walletError } = await supabase.rpc("credit_wallet", {
      p_user_id: transaction.user_id,
      p_amount: transaction.amount,
      p_transaction_type: "deposit",
      p_description: `M-Pesa deposit - ${mpesaReceiptNumber}`,
      p_reference: mpesaReceiptNumber,
    });

    if (walletError) {
      console.error("Error crediting wallet:", walletError);
      throw walletError;
    }

    console.log(`Wallet credited: ${transaction.amount} KES for user ${transaction.user_id}`);

    // Send notification
    await supabase.from("notifications").insert({
      user_id: transaction.user_id,
      title: "Deposit Successful",
      message: `Your M-Pesa deposit of KES ${amount} has been credited to your wallet.`,
      type: "transaction",
      priority: "high",
    });
  }
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

    const url = new URL(req.url);
    const path = url.pathname;

    // Handle M-Pesa callback
    if (path.includes("/callback") && req.method === "POST") {
      const callbackData = await req.json();
      await handleCallback(callbackData, supabaseClient);
      
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle STK Push initiation
    if (req.method === "POST") {
      const requestData: MPesaSTKPushRequest = await req.json();

      // Validate request
      if (!requestData.phoneNumber || !requestData.amount || !requestData.userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Initiate STK Push
      const stkResponse = await initiateSTKPush(requestData);

      // Save transaction to database
      const { error: dbError } = await supabaseClient
        .from("mpesa_transactions")
        .insert({
          user_id: requestData.userId,
          merchant_request_id: stkResponse.MerchantRequestID,
          checkout_request_id: stkResponse.CheckoutRequestID,
          phone_number: formatPhoneNumber(requestData.phoneNumber),
          amount: requestData.amount,
          account_reference: requestData.accountReference,
          transaction_desc: requestData.transactionDesc,
          status: "pending",
        });

      if (dbError) {
        console.error("Error saving transaction:", dbError);
        throw dbError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "STK Push sent successfully. Please check your phone.",
          checkoutRequestId: stkResponse.CheckoutRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle transaction status check
    if (req.method === "GET") {
      const checkoutRequestId = url.searchParams.get("checkoutRequestId");
      
      if (!checkoutRequestId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing checkoutRequestId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseClient
        .from("mpesa_transactions")
        .select("*")
        .eq("checkout_request_id", checkoutRequestId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, transaction: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("M-Pesa API Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
