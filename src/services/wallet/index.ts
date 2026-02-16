/**
 * Wallet Services
 * 
 * Centralized exports for all wallet-related services
 */

// Transfer Service (Enhanced)
export { transferService } from "./transfer.service";
export type { TransferRequest, TransferResponse } from "./transfer.service";

// Send Money Service (Backward compatibility wrapper)
export { sendMoneyService } from "./send-money.service";
export type { SendMoneyRequest, SendMoneyResponse } from "./send-money.service";

// Wallet Validator Service
export { walletValidatorService } from "./wallet-validator.service";
export type { WalletValidationResult, WalletDetails } from "./wallet-validator.service";

// Fee Calculator Service
export { calculateTransferFee, calculateTotalDeduction, getFeeBreakdown } from "./fee-calculator.service";

// Transaction Recorder Service
export { transactionRecorderService } from "./transaction-recorder.service";
export type { 
  SenderRecordParams, 
  RecipientRecordParams, 
  TransactionRecord 
} from "./transaction-recorder.service";

// Withdraw Service
export { withdrawService } from "./withdraw.service";
