// Payment Gateway Types

export interface PaymentTransaction {
  id: string;
  wallet_id: string;
  type: "deposit" | "withdrawal" | "transfer" | "airtime";
  amount: number;
  fee: number;
  status: "pending" | "success" | "failed";
  payment_method: "mpesa" | "pesapal" | "stripe" | "agent" | "airtime";
  provider?: string;
  transaction_id: string;
  reference_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DepositPayment {
  amount: number;
  method: "mpesa" | "pesapal" | "card";
}

export interface WithdrawalPayment {
  amount: number;
  method: "mpesa" | "agent";
  agentNumber?: string;
}

export interface TransferPayment {
  amount: number;
  recipientWalletId: string;
  recipientPhone?: string;
}

export interface AirtimePurchase {
  phoneNumber: string;
  amount: number;
  provider: "SAFARICOM" | "AIRTEL" | "TELKOM" | "ORANGE";
}

export interface PaymentGatewayConfig {
  mpesa: {
    enabled: boolean;
    shortcode: string;
    passkey: string;
  };
  pesapal: {
    enabled: boolean;
    consumerKey: string;
    consumerSecret: string;
  };
  airtime: {
    enabled: boolean;
    consumerKey: string;
    consumerSecret: string;
  };
  sms: {
    enabled: boolean;
    apiUrl: string;
    username: string;
    key: string;
  };
  stripe: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  demo?: boolean;
}
