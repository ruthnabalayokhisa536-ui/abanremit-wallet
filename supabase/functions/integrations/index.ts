import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Route to the correct integration handler
    switch (path) {
      case "mpesa-initiate":
        return handleMpesaInitiate(req);
      case "pesapal-initiate":
        return handlePesapalInitiate(req);
      case "card-initiate":
        return handleCardInitiate(req);
      case "confirm":
        return handleConfirm(req);
      case "webhook":
        return handleWebhook(req);
      case "sms-send":
        return handleSmsSend(req);
      default:
        return new Response(
          JSON.stringify({ error: "Unknown integration endpoint" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleMpesaInitiate(req: Request) {
  const body = await req.json();
  // Prepared for M-Pesa STK Push integration
  // Required: phone, amount, transaction_ref
  return new Response(
    JSON.stringify({
      status: "prepared",
      message: "M-Pesa STK Push endpoint ready for integration",
      required_fields: ["phone", "amount", "transaction_ref"],
      reference: body.transaction_ref || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePesapalInitiate(req: Request) {
  const body = await req.json();
  // Prepared for PesaPal payment initiation
  return new Response(
    JSON.stringify({
      status: "prepared",
      message: "PesaPal payment endpoint ready for integration",
      required_fields: ["amount", "currency", "description", "callback_url"],
      reference: body.transaction_ref || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCardInitiate(req: Request) {
  const body = await req.json();
  // Prepared for Card payment via PesaPal
  return new Response(
    JSON.stringify({
      status: "prepared",
      message: "Card payment endpoint ready for integration (via PesaPal)",
      required_fields: ["amount", "currency", "card_token", "callback_url"],
      reference: body.transaction_ref || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleConfirm(req: Request) {
  const body = await req.json();
  // Confirm payment status
  return new Response(
    JSON.stringify({
      status: "prepared",
      message: "Payment confirmation endpoint ready",
      reference: body.transaction_ref || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleWebhook(req: Request) {
  const body = await req.json();
  // Webhook receiver for payment providers
  console.log("Webhook received:", JSON.stringify(body));
  return new Response(
    JSON.stringify({ status: "received" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSmsSend(req: Request) {
  const body = await req.json();
  // SMS sending endpoint - prepared for provider integration
  // Fee: KES 0.40 per message
  return new Response(
    JSON.stringify({
      status: "prepared",
      message: "SMS endpoint ready for provider integration",
      required_fields: ["phone", "message"],
      fee: 0.40,
      recipient: body.phone || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
