// deno-lint-ignore-file

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SMSRequest {
  to: string;
  message: string;
  username: string;
  psk: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));
    
    const { to, message, username, psk }: SMSRequest = body;

    // Validate credentials
    const validUsername = Deno.env.get("SMS_API_USERNAME");
    const validPsk = Deno.env.get("SMS_API_KEY");

    console.log("Validating credentials...");
    console.log("Received username:", username);
    console.log("Expected username:", validUsername);

    if (username !== validUsername || psk !== validPsk) {
      console.error("Credential validation failed");
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate phone number format (254xxxxxxxxx)
    console.log("Validating phone number:", to);
    if (!to || !/^254\d{9}$/.test(to)) {
      console.error("Phone validation failed. Received:", to);
      return new Response(
        JSON.stringify({ 
          error: "Invalid phone number format. Use 254xxxxxxxxx",
          received: to,
          expected: "254xxxxxxxxx (12 digits total)"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate message
    console.log("Validating message. Length:", message?.length);
    if (!message || message.length === 0) {
      console.error("Message validation failed");
      return new Response(
        JSON.stringify({ error: "Message cannot be empty" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get TalkSasa API credentials
    const talksasaToken = Deno.env.get("TALKSASA_API_TOKEN") || "1956|W7r0b7vuSgcT2UqiYvFcKIodUOkSPlabpVtcVh4u7c347b80";
    const talksasaEndpoint = Deno.env.get("TALKSASA_API_ENDPOINT") || "https://bulksms.talksasa.com/api/v3";

    console.log("Sending SMS via TalkSasa...");
    console.log("To:", to);
    console.log("Message length:", message.length);

    // Send SMS via TalkSasa Bulk SMS API
    // TalkSasa expects: phone, message, sender_id
    const talksasaPayload = {
      phone: to,
      message: message,
      sender_id: "ABAN_COOL",
    };

    console.log("TalkSasa payload:", JSON.stringify(talksasaPayload));

    const response = await fetch(`${talksasaEndpoint}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${talksasaToken}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(talksasaPayload),
    });

    const data = await response.json();

    console.log("TalkSasa Response Status:", response.status);
    console.log("TalkSasa Response:", JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.message || data.error || "SMS sending failed");
    }

    // TalkSasa successful response
    return new Response(
      JSON.stringify({
        status: "sent",
        message: "SMS sent successfully via TalkSasa",
        messageId: data.message_id || data.id || `SMS${Date.now()}`,
        provider: "TalkSasa",
        data: data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("SMS API error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
