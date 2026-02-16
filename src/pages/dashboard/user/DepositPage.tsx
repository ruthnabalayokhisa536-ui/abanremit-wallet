import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Smartphone, CreditCard, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { mpesaService } from "@/services/payment/mpesa.service";
import { pesapalService } from "@/services/payment/pesapal.service";
import { paystackService } from "@/services/payment/paystack.service";

type Step = "form" | "confirm" | "processing" | "success" | "failed";
type Method = "mpesa" | "card" | "pesapal" | "paystack";

const DepositPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("mpesa");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>("");
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(60); // 60 second countdown
  
  // Card payment fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");

  const { wallet} = useWallet();
  const { profile } = useProfile();

  const serviceFee = method === "mpesa" ? 0 : 0; // No service fee for M-Pesa

  // Set phone number from profile
  useEffect(() => {
    if (profile?.phone) {
      setPhoneNumber(profile.phone);
    }
  }, [profile]);

  // Countdown timer for processing
  useEffect(() => {
    if (step === "processing" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  /* ================================
     M-PESA REALTIME LISTENER + POLLING
     ================================ */
  useEffect(() => {
    if (!checkoutRequestId) return;

    let pollInterval: NodeJS.Timeout;
    let pollAttempts = 0;
    const maxPollAttempts = 30; // 60 seconds (2s interval)

    // Realtime subscription
    const unsubscribe = mpesaService.subscribeToTransactionUpdates(
      checkoutRequestId,
      (transaction) => {
        setTransactionResult(transaction);
        
        if (transaction.status === "completed") {
          setStep("success");
          setIsProcessing(false);
          toast.success(`Deposit successful! KES ${transaction.amount} credited to your wallet.`);
          if (pollInterval) clearInterval(pollInterval);
        } else if (transaction.status === "failed") {
          setStep("failed");
          setIsProcessing(false);
          toast.error(transaction.result_desc || "Payment failed. Please try again.");
          if (pollInterval) clearInterval(pollInterval);
        }
      }
    );

    // Fallback polling (in case realtime doesn't work)
    pollInterval = setInterval(async () => {
      pollAttempts++;
      
      const transaction = await mpesaService.checkTransactionStatus(checkoutRequestId);
      
      if (transaction) {
        setTransactionResult(transaction);
        
        if (transaction.status === "completed") {
          setStep("success");
          setIsProcessing(false);
          toast.success(`Deposit successful! KES ${transaction.amount} credited to your wallet.`);
          clearInterval(pollInterval);
        } else if (transaction.status === "failed") {
          setStep("failed");
          setIsProcessing(false);
          toast.error(transaction.result_desc || "Payment failed. Please try again.");
          clearInterval(pollInterval);
        }
      }
      
      // Timeout after max attempts
      if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollInterval);
        setIsProcessing(false);
        toast.error("Transaction timeout. Please check your transaction history.");
        setStep("form");
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [checkoutRequestId]);

  /* ================================
     HANDLE CONFIRM PAYMENT
     ================================ */
  const handleConfirm = async () => {
    if (!amount || !wallet) {
      toast.error("Invalid amount or wallet");
      return;
    }

    if (!phoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    setIsProcessing(true);
    setStep("processing");

    try {
      if (method === "mpesa") {
        const result = await mpesaService.initiateDeposit({
          phoneNumber: phoneNumber,
          amount: Number(amount),
          accountReference: `WALLET-${wallet.wallet_id.slice(0, 8)}`,
          transactionDesc: "Wallet Deposit",
        });

        if (!result.success) {
          throw new Error(result.message);
        }

        if (result.checkoutRequestId) {
          setCheckoutRequestId(result.checkoutRequestId);
          setCountdown(60); // Reset countdown
        }

        toast.success(result.message, { duration: 5000 });
      }

      if (method === "paystack") {
        // Paystack card payment
        toast.info("Redirecting to Paystack...");
        
        const result = await paystackService.initializePayment({
          amount: Number(amount),
          email: profile?.email || user.email || "",
          metadata: {
            wallet_id: wallet.wallet_id,
            user_name: profile?.full_name || "User",
          },
        });

        if (!result.success) {
          throw new Error(result.message);
        }

        // Redirect to Paystack payment page
        if (result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
        }
      }

      if (method === "card") {
        // Stripe card payment
        toast.info("Redirecting to Stripe...");
        
        // Call Stripe Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              amount: Number(amount),
              userId: wallet.user_id,
              walletId: wallet.wallet_id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to create checkout session");
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        }
      }

      if (method === "pesapal") {
        // PesaPal payment
        const result = await pesapalService.initiateDeposit({
          amount: Number(amount),
          email: profile?.email || user.email || "",
          phone: phoneNumber,
          firstName: profile?.full_name?.split(" ")[0] || "User",
          lastName: profile?.full_name?.split(" ").slice(1).join(" ") || "Name",
        });

        if (!result.success) {
          throw new Error(result.message);
        }

        // Redirect to PesaPal payment page
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Payment initiation failed");
      setStep("confirm");
      setIsProcessing(false);
    }
  };

  /* ================================
     HANDLE RESET
     ================================ */
  const handleReset = () => {
    setStep("form");
    setAmount("");
    setCheckoutRequestId("");
    setTransactionResult(null);
    setIsProcessing(false);
  };

  /* ================================
     PROCESSING SCREEN
     ================================ */
  if (step === "processing") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Smartphone className="w-16 h-16 text-primary" />
                <Loader2 className="w-6 h-6 animate-spin text-primary absolute -top-1 -right-1" />
              </div>
              <h3 className="text-xl font-semibold text-center">
                Waiting for Payment
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Please check your phone for the M-Pesa prompt.
                <br />
                Enter your M-Pesa PIN to complete the payment.
              </p>
              
              {/* Countdown Timer */}
              <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
                <span className="text-muted-foreground">Time remaining:</span>
                <span className={countdown < 20 ? "text-red-600" : "text-primary"}>
                  {countdown}s
                </span>
              </div>
              
              <div className="w-full pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">KES {amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-semibold">{mpesaService.formatPhoneNumber(phoneNumber)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-4">
                This page will update automatically once payment is confirmed.
              </p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  /* ================================
     SUCCESS SCREEN
     ================================ */
  if (step === "success") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-center">
                Payment Successful!
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Your wallet has been credited successfully.
              </p>
              {transactionResult && (
                <div className="w-full pt-4 space-y-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">KES {transactionResult.amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Receipt:</span>
                    <span className="font-semibold">{transactionResult.mpesa_receipt_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold">
                      {new Date(transactionResult.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <Button onClick={handleReset} className="w-full mt-4">
                Make Another Deposit
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  /* ================================
     FAILED SCREEN
     ================================ */
  if (step === "failed") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-center">
                Payment Failed
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {transactionResult?.result_desc || "The payment could not be completed. Please try again."}
              </p>
              <div className="flex gap-3 w-full mt-4">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={() => setStep("form")} className="flex-1">
                  Back to Form
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  /* ================================
     MAIN RENDER
     ================================ */
  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Load Wallet</h2>

        {step === "form" && (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                <button
                  onClick={() => setMethod("mpesa")}
                  className={`p-4 rounded-lg border-2 transition ${
                    method === "mpesa"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Smartphone className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">M-Pesa</span>
                </button>

                <button
                  onClick={() => setMethod("paystack")}
                  className={`p-4 rounded-lg border-2 transition ${
                    method === "paystack"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">Paystack</span>
                </button>

                <button
                  onClick={() => setMethod("card")}
                  className={`p-4 rounded-lg border-2 transition ${
                    method === "card"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">Stripe</span>
                </button>

                <button
                  onClick={() => setMethod("pesapal")}
                  className={`p-4 rounded-lg border-2 transition ${
                    method === "pesapal"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Banknote className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">PesaPal</span>
                </button>
              </div>
            </div>

            {(method === "mpesa" || method === "pesapal") && (
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {method === "mpesa" 
                    ? "Enter the M-Pesa phone number to receive the payment prompt"
                    : "Enter your phone number for payment confirmation"}
                </p>
              </div>
            )}

            {method === "card" && (
              <>
                <div>
                  <label className="text-sm font-medium">Cardholder Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Card Number</label>
                  <Input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '');
                      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                      setCardNumber(formatted);
                    }}
                    maxLength={19}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Expiry Date</label>
                    <Input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          setCardExpiry(value.slice(0, 2) + '/' + value.slice(2, 4));
                        } else {
                          setCardExpiry(value);
                        }
                      }}
                      maxLength={5}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">CVV</label>
                    <Input
                      type="text"
                      placeholder="123"
                      value={cardCVV}
                      onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ''))}
                      maxLength={4}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    💳 Pay securely with Visa, Mastercard, or American Express via Stripe
                  </p>
                </div>
              </>
            )}

            {method === "pesapal" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-900">
                  🏦 Pay with PesaPal - Supports cards, mobile money, and bank transfers
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Amount (KES)</label>
              <Input
                type="number"
                placeholder="Enter amount (Min: 1, Max: 150,000)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="150000"
                className="mt-1"
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ You will receive KES {amount} in your wallet
                </p>
              )}
            </div>

            <Button
              onClick={() => setStep("confirm")}
              disabled={
                !amount || 
                Number(amount) < 1 ||
                ((method === "mpesa" || method === "pesapal") && !phoneNumber) ||
                (method === "card" && (!cardNumber || !cardName || !cardExpiry || !cardCVV))
              }
              className="w-full"
            >
              Continue
            </Button>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Confirm Payment</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {method === "mpesa" ? (
                  <Smartphone className="w-5 h-5 text-primary" />
                ) : method === "card" ? (
                  <CreditCard className="w-5 h-5 text-primary" />
                ) : (
                  <Banknote className="w-5 h-5 text-primary" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {method === "mpesa" ? "M-Pesa" : method === "card" ? "Card Payment" : "PesaPal"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {method === "mpesa" 
                      ? mpesaService.formatPhoneNumber(phoneNumber) 
                      : method === "card"
                      ? `**** **** **** ${cardNumber.slice(-4)}`
                      : pesapalService.getStatusLabel("pending")}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">KES {Number(amount).toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>

                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary text-lg">
                    KES {Number(amount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  {method === "mpesa" 
                    ? "You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment."
                    : method === "card"
                    ? "You will be redirected to Stripe's secure payment page to enter your card details."
                    : "You will be redirected to PesaPal to complete your payment securely."}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1"
                disabled={isProcessing}
              >
                Back
              </Button>

              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DepositPage;