import { supabase } from "@/integrations/supabase/client";

interface InitializePaymentRequest {
  amount: number;
  email: string;
  metadata?: Record<string, any>;
}

interface InitializePaymentResponse {
  success: boolean;
  message: string;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}

export const paystackService = {
  getCredentials() {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
    const callbackUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/paystack-callback';
    if (!publicKey || !secretKey) throw new Error('Paystack credentials not configured');
    return { publicKey, secretKey, callbackUrl };
  },

  async initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    try {
      const { secretKey, callbackUrl } = this.getCredentials();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { success: false, message: "User not authenticated", error: "AUTH_ERROR" };

      const { data: wallet, error: walletError } = await supabase
        .from("wallets").select("id, wallet_id").eq("user_id", user.id).eq("is_agent_wallet", false).single();
      if (walletError || !wallet) return { success: false, message: "Wallet not found", error: "WALLET_NOT_FOUND" };

      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const amountInKobo = Math.round(request.amount * 100);

      // Create paystack transaction record using raw insert
      const { data: transaction, error: txError } = await (supabase as any)
        .from("paystack_transactions")
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          reference: reference,
          amount: request.amount,
          currency: "KES",
          status: "pending",
          email: request.email,
          metadata: request.metadata || {},
        })
        .select()
        .single();

      if (txError) {
        console.error("Error creating transaction:", txError);
        return { success: false, message: "Failed to create transaction", error: "TRANSACTION_ERROR" };
      }

      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { "Authorization": `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: request.email,
          amount: amountInKobo,
          currency: "KES",
          reference: reference,
          callback_url: `${callbackUrl}?reference=${reference}`,
          metadata: { wallet_id: wallet.wallet_id, user_id: user.id, ...request.metadata },
        }),
      });

      const paystackData = await paystackResponse.json();
      if (!paystackResponse.ok || !paystackData.status) {
        await (supabase as any).from("paystack_transactions").update({ status: "failed" }).eq("id", (transaction as any)?.id);
        return { success: false, message: paystackData.message || "Failed to initialize payment", error: "PAYSTACK_ERROR" };
      }

      return { success: true, message: "Payment initialized successfully", authorizationUrl: paystackData.data.authorization_url, reference };
    } catch (error: any) {
      console.error("Initialize payment error:", error);
      return { success: false, message: error.message || "Failed to initialize payment", error: error.message };
    }
  },

  async verifyPayment(reference: string): Promise<any> {
    try {
      const { secretKey } = this.getCredentials();
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${secretKey}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Verification failed: ${response.status}`);
      return await response.json();
    } catch (error: any) { console.error("Verify payment error:", error); return null; }
  },

  async getTransactionStatus(reference: string): Promise<any> {
    try {
      const { data, error } = await (supabase as any).from("paystack_transactions").select("*").eq("reference", reference).single();
      if (error) { console.error("Error fetching transaction:", error); return null; }
      return data;
    } catch (error) { console.error("Get transaction status error:", error); return null; }
  },

  formatAmount(amount: number): string {
    return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
};

export default paystackService;
