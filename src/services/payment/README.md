# Payment Services Integration Guide

All payment gateway integrations are available in `/src/services/payment/`.

## Quick Start

### 1. M-Pesa Payment

```typescript
import { mpesaService } from "@/services/payment";

// Initiate payment
const result = await mpesaService.initiate({
  amount: 1000,
  phoneNumber: "254700000001", // or "0700000001"
  accountReference: "WLT888001",
  transactionDesc: "Wallet Top-up"
});

// Poll for status
const status = await mpesaService.checkStatus(result.checkoutRequestId);

// Format phone number
const formatted = mpesaService.formatPhoneNumber("0700000001");
```

### 2. PesaPal Payment

```typescript
import { pesapalService } from "@/services/payment";

// Initiate payment
const result = await pesapalService.initiate({
  amount: 1000,
  description: "Wallet Top-up via PesaPal",
  phoneNumber: "254700000001"
});

// Redirect user to payment page
window.location.href = result.redirectUrl;

// Check status
const status = await pesapalService.checkStatus(result.orderId);

// Supported methods
const methods = pesapalService.getSupportedMethods();
```

### 3. Airtime Purchase

```typescript
import { airtimeService } from "@/services/payment";

// Initiate airtime purchase
const result = await airtimeService.initiate({
  phoneNumber: "0700000001",
  amount: 100,
  provider: "SAFARICOM" // or AIRTEL, TELKOM, ORANGE
});

// Get supported networks
const networks = airtimeService.getSupportedNetworks();

// Get network info
const info = airtimeService.getNetworkInfo("SAFARICOM");
// Returns: { name, minAmount, maxAmount, commissionRate }

// Validate phone number
const isValid = airtimeService.isValidPhone("254700000001");
```

### 4. SMS Notifications

```typescript
import { smsService } from "@/services/payment";

// Send custom SMS
const result = await smsService.sendSms({
  to: "254700000001",
  message: "Your custom message here"
});

// Send predefined notifications
await smsService.sendDepositConfirmation("254700000001", 1000, "WLT001", "TXN123");
await smsService.sendWithdrawalConfirmation("254700000001", 1000, 25, "TXN124");
await smsService.sendTransferConfirmation("254700000001", 500, "WLT002", "TXN125");
await smsService.sendAirtimeConfirmation("254700000001", 100, "SAFARICOM", "TXN126");
```

### 5. Card Payments (Stripe - Framework Ready)

```typescript
import { stripeService } from "@/services/payment";

// Check if Stripe is configured
if (stripeService.isConfigured()) {
  // Create payment intent
  const intent = await stripeService.createPaymentIntent({
    amount: 1000,
    description: "Wallet Top-up",
    email: "user@example.com"
  });
}

// Get status
const status = stripeService.getConfigurationStatus();
```

---

## Implementation Examples

### Deposit Page Integration

```typescript
import { mpesaService, pesapalService, smsService } from "@/services/payment";

const handleMpesaDeposit = async () => {
  try {
    const result = await mpesaService.initiate({
      amount: Number(amount),
      phoneNumber: wallet.owner_phone,
      accountReference: wallet.wallet_id,
      transactionDesc: "Wallet Top-up"
    });

    // Poll for status
    let attempts = 0;
    const checkPayment = async () => {
      const status = await mpesaService.checkStatus(result.checkoutRequestId);
      if (status.status === "success") {
        // Send SMS confirmation
        await smsService.sendDepositConfirmation(
          wallet.owner_phone,
          Number(amount),
          wallet.wallet_id,
          result.checkoutRequestId
        );
        setStep("receipt");
      } else if (attempts < 30) {
        attempts++;
        setTimeout(checkPayment, 2000); // Check every 2 seconds
      }
    };

    checkPayment();
  } catch (error) {
    toast.error("Payment initiation failed");
  }
};
```

### Airtime Page Integration

```typescript
import { airtimeService, smsService } from "@/services/payment";

const handleAirtimePurchase = async () => {
  // Validate
  if (!airtimeService.isValidPhone(phone)) {
    toast.error("Invalid phone number");
    return;
  }

  try {
    const result = await airtimeService.initiate({
      phoneNumber: phone,
      amount: Number(amount),
      provider: selectedNetwork.provider
    });

    if (result.status === "done") {
      // Send SMS
      await smsService.sendAirtimeConfirmation(
        phone,
        Number(amount),
        selectedNetwork.name,
        result.transactionId
      );

      setStep("receipt");
      toast.success("Airtime purchased successfully!");
    }
  } catch (error) {
    toast.error("Airtime purchase failed");
  }
};
```

---

## Demo Mode

All services fall back to demo mode if:
- API credentials are missing
- Network request fails
- API service is unavailable

Demo mode responses include `demo: true` flag. In production, you should:
1. Ensure all `.env` variables are properly configured
2. Verify API credentials with payment providers
3. Test endpoints thoroughly before going live
4. Implement error logging and monitoring

---

## Error Handling

### Safe Try-Catch Pattern

```typescript
try {
  const result = await mpesaService.initiate({...});
  // Process successful response
} catch (error) {
  // Service already has fallback to demo mode
  // Additional error handling here
  console.error("Payment error:", error);
  toast.error("Payment processing failed. Please try again.");
}
```

### Phone Number Validation

All services provide phone number formatting and validation:

```typescript
// User enters: 0700000001
const formatted = mpesaService.formatPhoneNumber("0700000001");
// Output: 254700000001

// Validate before sending
if (airtimeService.isValidPhone("254700000001")) {
  // Safe to use
}
```

---

## Environment Variables

Required `.env` variables (see `.env.example`):

```env
# M-Pesa
VITE_MPESA_SHORTCODE=000772
VITE_MPESA_PASSKEY=...
VITE_MPESA_CALLBACK_URL=...

# PesaPal
VITE_PESAPAL_CONSUMER_KEY=...
VITE_PESAPAL_CONSUMER_SECRET=...

# Airtime
VITE_AIRTIME_API_URL=...
VITE_AIRTIME_CONSUMER_KEY=...
VITE_AIRTIME_CONSUMER_SECRET=...

# SMS
VITE_SMS_API_URL=...
VITE_SMS_API_USERNAME=...
VITE_SMS_API_KEY=...

# Stripe (Optional - Framework Ready)
VITE_STRIPE_PUBLIC_KEY=...
VITE_STRIPE_SECRET_KEY=...

# API
VITE_API_BASE_URL=http://localhost:5000
```

---

## Transaction Status Polling

For payment gateways that require polling (M-Pesa):

```typescript
let attempts = 0;
const maxAttempts = 30; // 30 checks × 2 seconds = 1 minute timeout

const pollPaymentStatus = async (checkoutRequestId: string) => {
  while (attempts < maxAttempts) {
    const status = await mpesaService.checkStatus(checkoutRequestId);
    
    if (status.status === "success") {
      // Payment confirmed
      return "SUCCESS";
    } else if (status.status === "failed") {
      // Payment cancelled
      return "FAILED";
    }
    
    // Wait before next check
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }
  
  return "TIMEOUT";
};
```

---

## Production Checklist

- [ ] All payment gateway credentials verified
- [ ] SMS API tested and working
- [ ] Phone number formatting tested for all providers
- [ ] Webhook callbacks configured (if required)
- [ ] Error logging setup
- [ ] Rate limiting enabled
- [ ] HTTPS configured
- [ ] Admin dashboard updated to show payment status
- [ ] User notifications tested
- [ ] Transaction history properly recorded

---

## Support

For issues with specific payment providers:
- **M-Pesa**: https://developer.safaricom.co.ke/
- **PesaPal**: https://www.pesapal.com/
- **Airtime (Instalipa)**: https://business.instalipa.co.ke/

All services include console logging for debugging. Check browser console and server logs for detailed error messages.
