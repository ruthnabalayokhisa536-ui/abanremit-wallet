// Instalipa API Proxy
// Handles Instalipa airtime purchases server-side to avoid CORS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PurchaseRequest {
  phoneNumber: string;
  amount: number;
  network: string;
  reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Instalipa credentials from environment
    const apiUrl = Deno.env.get("INSTALIPA_API_URL") || "https://business.instalipa.co.ke";
    const consumerKey = Deno.env.get("INSTALIPA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("INSTALIPA_CONSUMER_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!consumerKey || !consumerSecret) {
      throw new Error("Instalipa credentials not configured");
    }

    const { phoneNumber, amount, network, reference }: PurchaseRequest = await req.json();

    // Generate reference if not provided
    const txReference = reference || `AIRTIME-${Date.now()}`;

    // Callback URL - Instalipa will call this when transaction completes
    const callbackUrl = supabaseUrl 
      ? `${supabaseUrl}/functions/v1/airtime-callback`
      : "https://vnlevzndmktifkkdnrns.supabase.co/functions/v1/airtime-callback";

    console.log("Instalipa purchase request:", { phoneNumber, amount, network, reference: txReference, callbackUrl });

    // Step 1: Get OAuth token
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    
    const tokenResponse = await fetch(`${apiUrl}/api/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token request failed:", errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token in response");
    }

    // Step 2: Purchase airtime
    const purchasePayload = {
      phone_number: phoneNumber,
      amount: amount,
      network: network,
      reference: txReference,
      callback_url: callbackUrl,
    };

    console.log("Sending to Instalipa:", purchasePayload);

    const purchaseResponse = await fetch(`${apiUrl}/api/v1/airtime/purchase`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(purchasePayload),
    });

    if (!purchaseResponse.ok) {
      const errorText = await purchaseResponse.text();
      console.error("Purchase request failed:", errorText);
      throw new Error(`Airtime purchase failed: ${purchaseResponse.status}`);
    }

    const purchaseData = await purchaseResponse.json();

    console.log("Instalipa response:", purchaseData);

    return new Response(
      JSON.stringify({
        success: true,
        data: purchaseData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Instalipa API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
