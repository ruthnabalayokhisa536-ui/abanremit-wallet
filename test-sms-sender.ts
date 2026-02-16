/**
 * Test script to verify SMS sending with ABAN_COOL sender ID
 * Run with: bun run test-sms-sender.ts
 */

const TALKSASA_TOKEN = "1956|W7r0b7vuSgcT2UqiYvFcKIodUOkSPlabpVtcVh4u7c347b80";
const TALKSASA_ENDPOINT = "https://bulksms.talksasa.com/api/v3";

async function testSMS(phoneNumber: string) {
  console.log("🧪 Testing SMS with ABAN_COOL sender ID...\n");
  
  const payload = {
    phone: phoneNumber,
    sender_id: "ABAN_COOL",
    message: "Test message from ABANREMIT. Your sender ID is now active!",
  };

  console.log("📤 Sending SMS:");
  console.log("  To:", phoneNumber);
  console.log("  Sender ID:", payload.sender_id);
  console.log("  Message:", payload.message);
  console.log("");

  try {
    const response = await fetch(`${TALKSASA_ENDPOINT}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TALKSASA_TOKEN}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("📥 Response Status:", response.status);
    console.log("📥 Response Data:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ SMS sent successfully!");
      console.log("   Message ID:", data.message_id || data.id);
    } else {
      console.log("\n❌ SMS sending failed!");
      console.log("   Error:", data.message || data.error);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

// Get phone number from command line or use default test number
const phoneNumber = process.argv[2] || "254700000000";

testSMS(phoneNumber);
