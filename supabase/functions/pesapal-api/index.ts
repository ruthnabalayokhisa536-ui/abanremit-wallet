import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// PesaPal Production Credentials
const PESAPAL_CONSUMER_KEY = "Ij9c0ncBD8JqKbTNMfN5Q3o+SLK7YyLj";
const PESAPAL_CONSUMER_SECRET = "HIQ3QmVK2haspJYKIFvGmDJl4wY=";
const PESAPAL_API_URL = "https://pay.pesapal.com/v3";

interface PesaPalRequest {
  amount: number;
  userId: string;
  walletId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

/**
 * Get PesaPal OAuth Access Token
 */
async function getAccessToken(): Promise<string> {
  const response = await fetch(`${PESAPAL_API_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Register IPN (Instant Payment Notification) URL
 */
async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  const response = await fetch(`${PESAPAL_API_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "GET",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register IPN: ${error}`);
  }

  const data = await response.json();
  return data.ipn_id;
}

/**
 * Submit Order Request to PesaPal
 */
async function submitOrderRequest(
  token: string,
  ipnId: string,
  request: PesaPalRequest,
  callbackUrl: string
): Promise<any> {
  const orderId = `ORDER-${Date.now()}-${request.userId.slice(0, 8)}`;

  const payload = {
    id: orderId,
    currency: "KES",
    amount: request.amount,
    description: "Wallet Deposit",
    callback_url: callbackUrl,
    notification_id: ipnId,
    billing_address: {
      email_address: request.email,
      phone_number: request.phone,
      country_code: "KE",
      first_name: request.firstName,
      middle_name: "",
      last_name: request.lastName,
      line_1: "",
      line_2: "",
      city: "",
      state: "",
      postal_code: "",
      zip_code: "",
    },
  };

  const response = await fetch(`${PESAPAL_API_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit order: ${error}`);
  }

  const data = await response.json();
  return { ...data, orderId };
}

/**
 * Get Transaction Status
 */
async function getTransactionStatus(token: string, orderTrackingId: string): Promise<any> {
  const response = await fetch(
    `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get transaction status: ${error}`);
  }

  return await response.json();
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

    // Handle IPN callback
    if (path.includes("/callback") && req.method === "GET") {
      const orderTrackingId = url.searchParams.get("OrderTrackingId");
      const orderMerchantReference = url.searchParams.get("OrderMerchantReference");

      if (!orderTrackingId) {
        return new Response("Missing OrderTrackingId", { status: 400 });
      }

      console.log("PesaPal IPN callback:", { orderTrackingId, orderMerchantReference });

      // Get access token
      const token = await getAccessToken();

      // Get transaction status
      const status = await getTransactionStatus(token, orderTrackingId);

      console.log("Transaction status:", status);

      // Update transaction in database
      const { error: updateError } = await supabaseClient
        .from("pesapal_transactions")
        .update({
          payment_status_code: status.payment_status_code,
          payment_status_description: status.payment_status_description,
          payment_method: status.payment_method,
          status: status.payment_status_code === 1 ? "completed" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_tracking_id", orderTrackingId);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      }

      // If successful, credit wallet
      if (status.payment_status_code === 1) {
        const { data: transaction } = await supabaseClient
          .from("pesapal_transactions")
          .select("user_id, amount")
          .eq("order_tracking_id", orderTrackingId)
          .single();

        if (transaction) {
          // Credit wallet
          const { error: walletError } = await supabaseClient.rpc("credit_wallet", {
            p_user_id: transaction.user_id,
            p_amount: transaction.amount,
            p_transaction_type: "deposit",
            p_description: `PesaPal deposit - ${orderTrackingId}`,
            p_reference: orderTrackingId,
          });

          if (walletError) {
            console.error("Error crediting wallet:", walletError);
          } else {
            console.log(`Wallet credited: ${transaction.amount} KES for user ${transaction.user_id}`);

            // Send notification
            await supabaseClient.from("notifications").insert({
              user_id: transaction.user_id,
              title: "Deposit Successful",
              message: `Your PesaPal deposit of KES ${transaction.amount} has been credited to your wallet.`,
              type: "transaction",
              priority: "high",
            });
          }
        }
      }

      return new Response("OK", { headers: corsHeaders });
    }

    // Handle transaction status check
    if (req.method === "GET") {
      const orderTrackingId = url.searchParams.get("orderTrackingId");

      if (!orderTrackingId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing orderTrackingId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseClient
        .from("pesapal_transactions")
        .select("*")
        .eq("order_tracking_id", orderTrackingId)
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

    // Handle order submission
    if (req.method === "POST") {
      const requestData: PesaPalRequest = await req.json();

      // Validate request
      if (!requestData.amount || !requestData.userId || !requestData.email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get access token
      const token = await getAccessToken();

      // Get callback URLs
      const baseUrl = Deno.env.get("SUPABASE_URL") || "";
      const ipnUrl = `${baseUrl}/functions/v1/pesapal-api/callback`;
      const callbackUrl = `${req.headers.get("origin") || "http://localhost:8081"}/dashboard/deposit?pesapal=success`;

      // Register IPN (or use existing)
      let ipnId = Deno.env.get("PESAPAL_IPN_ID");
      if (!ipnId) {
        ipnId = await registerIPN(token, ipnUrl);
        console.log("Registered IPN ID:", ipnId);
      }

      // Submit order request
      const orderResponse = await submitOrderRequest(token, ipnId, requestData, callbackUrl);

      // Save transaction to database
      const { error: dbError } = await supabaseClient
        .from("pesapal_transactions")
        .insert({
          user_id: requestData.userId,
          wallet_id: requestData.walletId,
          order_tracking_id: orderResponse.order_tracking_id,
          merchant_reference: orderResponse.orderId,
          amount: requestData.amount,
          currency: "KES",
          status: "pending",
        });

      if (dbError) {
        console.error("Error saving transaction:", dbError);
        throw dbError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Order created successfully. Redirecting to payment page...",
          redirectUrl: orderResponse.redirect_url,
          orderTrackingId: orderResponse.order_tracking_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("PesaPal API Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
