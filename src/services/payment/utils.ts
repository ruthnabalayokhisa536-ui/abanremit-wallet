/**
 * Payment Utilities
 * Helper functions for payment processing
 */

/**
 * Format currency to KES display format
 */
export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Calculate transaction fee
 */
export const calculateFee = (amount: number, feeType: "deposit" | "withdrawal" | "transfer"): number => {
  const feeRates: Record<string, number> = {
    deposit: 0.4, // Flat fee
    withdrawal: Math.max(30, amount * 0.01), // 1% or KES 30 minimum
    transfer: Math.max(25, amount * 0.01), // 1% or KES 25 minimum
  };

  return feeRates[feeType] || 0;
};

/**
 * Format phone number for display
 */
export const formatPhoneForDisplay = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, "");

  // Convert 254 format to 07xx format for display
  if (cleaned.startsWith("254")) {
    return "0" + cleaned.substring(3);
  }

  // Ensure it starts with 0
  if (!cleaned.startsWith("0")) {
    return "07" + cleaned.substring(cleaned.length - 8);
  }

  return cleaned;
};

/**
 * Validate wallet ID format
 */
export const isValidWalletId = (id: string): boolean => {
  // Wallet IDs are typically numeric or alphanumeric
  return /^[\w\d]{6,20}$/.test(id);
};

/**
 * Validate phone number for East Africa
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  let cleaned = phone.replace(/\D/g, "");

  // Should be 12 digits when formatted as 254xxxxxxxxx
  if (cleaned.startsWith("254")) {
    return cleaned.length === 12;
  }

  // Or 10 digits when 07xxxxxxxxx
  if (cleaned.startsWith("0")) {
    return cleaned.length === 10;
  }

  return false;
};

/**
 * Generate unique transaction ID
 */
export const generateTransactionId = (prefix: string = "TXN"): string => {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

/**
 * Format transaction type for display
 */
export const formatTransactionType = (type: string): string => {
  const typeMap: Record<string, string> = {
    deposit: "Money In",
    withdrawal: "Money Out",
    transfer: "Transfer",
    airtime: "Airtime",
  };
  return typeMap[type] || type;
};

/**
 * Get transaction status badge color
 */
export const getTransactionStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

/**
 * Calculate daily withdrawal limit
 */
export const calculateDailyLimit = (userType: "user" | "agent"): number => {
  const limits: Record<string, number> = {
    user: 500000, // KES 500,000
    agent: 5000000, // KES 5,000,000
  };
  return limits[userType] || 0;
};

/**
 * Calculate transaction limits by user tier
 */
export const getTransactionLimits = (userType: string): {
  perTransaction: number;
  daily: number;
  monthly: number;
} => {
  const limits: Record<string, any> = {
    user: {
      perTransaction: 500000, // KES 500,000
      daily: 1000000, // KES 1,000,000
      monthly: 10000000, // KES 10,000,000
    },
    agent: {
      perTransaction: 5000000, // KES 5,000,000
      daily: 50000000, // KES 50,000,000
      monthly: 500000000, // KES 500,000,000
    },
    admin: {
      perTransaction: Number.MAX_SAFE_INTEGER,
      daily: Number.MAX_SAFE_INTEGER,
      monthly: Number.MAX_SAFE_INTEGER,
    },
  };

  return limits[userType] || limits.user;
};

/**
 * Check if transaction amount is within limits
 */
export const isWithinTransactionLimits = (
  amount: number,
  userType: string,
  dailyUsed: number = 0,
  monthlyUsed: number = 0
): { valid: boolean; message: string } => {
  const limits = getTransactionLimits(userType);

  if (amount > limits.perTransaction) {
    return {
      valid: false,
      message: `Amount exceeds per-transaction limit of KES ${limits.perTransaction.toLocaleString()}`,
    };
  }

  if (dailyUsed + amount > limits.daily) {
    return {
      valid: false,
      message: `Amount would exceed daily limit of KES ${limits.daily.toLocaleString()}`,
    };
  }

  if (monthlyUsed + amount > limits.monthly) {
    return {
      valid: false,
      message: `Amount would exceed monthly limit of KES ${limits.monthly.toLocaleString()}`,
    };
  }

  return { valid: true, message: "" };
};

/**
 * Format transaction timestamp
 */
export const formatTransactionTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
