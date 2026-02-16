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

    // Validate phone number format (254xxxxxxxxx) - relaxed validation
    console.log("Validating phone number:", to);
    if (!to) {
      console.error("Phone validation failed: No phone number provided");
      return new Response(
        JSON.stringify({ 
          error: "Phone number is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Clean and format phone number
    let cleanedPhone = to.replace(/\D/g, "");
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "254" + cleanedPhone.substring(1);
    } else if (!cleanedPhone.startsWith("254")) {
      cleanedPhone = "254" + cleanedPhone;
    }
    
    // Validate cleaned phone
    if (!/^254\d{9}$/.test(cleanedPhone)) {
      console.error("Phone validation failed after cleaning. Received:", to, "Cleaned:", cleanedPhone);
      return new Response(
        JSON.stringify({ 
          error: "Invalid phone number format. Use 254xxxxxxxxx or 07xxxxxxxx",
          received: to,
          cleaned: cleanedPhone,
          expected: "254xxxxxxxxx (12 digits total)"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Phone number validated and cleaned:", cleanedPhone);

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
      phone: cleanedPhone, // Use cleaned phone number
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

    // Check for TalkSasa-specific error indicators
    // TalkSasa may return 200 but with error status in body
    if (!response.ok || data.status === "error" || data.error) {
      const errorMsg = data.message || data.error || "SMS sending failed";
      console.error("TalkSasa API Error:", errorMsg);
      console.error("Full error response:", JSON.stringify(data));
      
      // Return detailed error for debugging
      return new Response(
        JSON.stringify({
          status: "failed",
          error: errorMsg,
          provider: "TalkSasa",
          debug: {
            httpStatus: response.status,
            responseBody: data,
            phoneUsed: cleanedPhone,
            messageLength: message.length,
          }
        }),
        {
          status: response.ok ? 200 : response.status, // Return 200 even on SMS failure for client handling
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // TalkSasa successful response
    return new Response(
      JSON.stringify({
        status: "sent",
        message: "SMS sent successfully via TalkSasa",
        messageId: data.message_id || data.id || `SMS${Date.now()}`,
        provider: "TalkSasa",
        data: data,
        debug: {
          talksasaStatus: response.status,
          talksasaResponse: data,
          phoneUsed: cleanedPhone,
        }
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
