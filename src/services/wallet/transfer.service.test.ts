import { describe, it, expect, beforeEach, vi } from "vitest";
import { transferService } from "./transfer.service";
import { supabase } from "@/integrations/supabase/client";

// Mock the Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock the services
vi.mock("./wallet-validator.service", () => ({
  walletValidatorService: {
    validateRecipient: vi.fn(),
    getWalletDetails: vi.fn(),
  },
}));

vi.mock("../payment/balance.service", () => ({
  balanceService: {
    validateTransferBalance: vi.fn(),
    deductFromSender: vi.fn(),
    creditToRecipient: vi.fn(),
    rollbackSenderDeduction: vi.fn(),
  },
}));

vi.mock("./transaction-recorder.service", () => ({
  transactionRecorderService: {
    createSenderRecord: vi.fn(),
    createRecipientRecord: vi.fn(),
  },
}));

vi.mock("../transaction-pin.service", () => ({
  transactionPinService: {
    validatePin: vi.fn(),
  },
}));

describe("transferService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeTransfer", () => {
    it("should reject transfer with invalid amount", async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 0,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_AMOUNT");
      expect(result.message).toBe("Amount must be greater than 0");
    });

    it("should reject transfer when user is not authenticated", async () => {
      // Mock unauthenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("AUTH_ERROR");
      expect(result.message).toBe("User not authenticated");
    });

    it("should reject transfer when sender wallet is not found", async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock wallet query returning no wallet
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("SENDER_WALLET_NOT_FOUND");
    });
  });

  describe("calculateFee", () => {
    it("should calculate minimum fee for small amounts", () => {
      const fee = transferService.calculateFee(100);
      expect(fee).toBe(5); // Minimum fee
    });

    it("should calculate percentage fee for medium amounts", () => {
      const fee = transferService.calculateFee(2000);
      expect(fee).toBe(10); // 2000 * 0.005 = 10
    });

    it("should calculate maximum fee for large amounts", () => {
      const fee = transferService.calculateFee(15000);
      expect(fee).toBe(50); // Maximum fee
    });
  });

  describe("getTransferHistory", () => {
    it("should return empty array when user is not authenticated", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await transferService.getTransferHistory();
      expect(result).toEqual([]);
    });

    it("should use default limit of 50 records", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await transferService.getTransferHistory(); // No limit specified, should default to 50

      // Verify range was called with correct parameters (0 to 49 for limit of 50)
      expect(mockRange).toHaveBeenCalledWith(0, 49);
    });

    it("should enforce maximum limit of 100", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await transferService.getTransferHistory(200); // Request 200, should be capped at 100

      // Verify range was called with correct parameters (0 to 99 for limit of 100)
      expect(mockRange).toHaveBeenCalledWith(0, 99);
    });

    it("should filter by send_money and receive_money types", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockIn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: mockIn,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await transferService.getTransferHistory();

      // Verify in was called with correct transaction types
      expect(mockIn).toHaveBeenCalledWith("type", ["send_money", "receive_money"]);
    });

    it("should order by created_at descending", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockOrder = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: mockOrder,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await transferService.getTransferHistory();

      // Verify order was called with correct parameters
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should return all required fields", async () => {
      const mockTransactions = [
        {
          id: "txn-1",
          type: "send_money",
          amount: -100,
          fee: 5,
          balance_after: 895,
          description: "Test transfer",
          reference: "WLT88812345",
          receipt_reference: "TXN-20240101-00001",
          status: "completed",
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "txn-2",
          type: "receive_money",
          amount: 200,
          fee: 0,
          balance_after: 1095,
          description: "Received payment",
          reference: "WLT88854321",
          receipt_reference: "TXN-20240101-00002",
          status: "completed",
          created_at: "2024-01-01T11:00:00Z",
        },
      ];

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await transferService.getTransferHistory();

      // Verify all required fields are present
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("amount");
      expect(result[0]).toHaveProperty("reference");
      expect(result[0]).toHaveProperty("description");
      expect(result[0]).toHaveProperty("fee");
      expect(result[0]).toHaveProperty("receipt_reference");
      expect(result[1]).toHaveProperty("amount");
      expect(result[1]).toHaveProperty("reference");
      expect(result[1]).toHaveProperty("description");
      expect(result[1]).toHaveProperty("fee");
      expect(result[1]).toHaveProperty("receipt_reference");
    });

    it("should handle pagination with offset", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await transferService.getTransferHistory(20, 40); // Get 20 records starting from offset 40

      // Verify range was called with correct parameters (40 to 59)
      expect(mockRange).toHaveBeenCalledWith(40, 59);
    });

    it("should return empty array on database error", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await transferService.getTransferHistory();
      expect(result).toEqual([]);
    });
  });

  describe("validateTransferRequest", () => {
    it("should return validation errors for invalid amount", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await transferService.validateTransferRequest({
        recipientWalletNumber: "WLT88812345",
        amount: -100,
        pin: "1234",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Amount must be greater than 0");
    });

    it("should return validation errors when user is not authenticated", async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await transferService.validateTransferRequest({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("User not authenticated");
    });
  });

  describe("Edge Cases", () => {
    // Import the mocked services (these are already mocked at the top of the file)
    let walletValidatorService: any;
    let balanceService: any;
    let transactionPinService: any;
    let transactionRecorderService: any;

    beforeEach(async () => {
      // Get references to the mocked modules
      walletValidatorService = (await import("./wallet-validator.service")).walletValidatorService;
      balanceService = (await import("../payment/balance.service")).balanceService;
      transactionPinService = (await import("../transaction-pin.service")).transactionPinService;
      transactionRecorderService = (await import("./transaction-recorder.service")).transactionRecorderService;

      // Setup common mocks for edge case tests
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "wallet-123",
                  balance: 1000,
                  wallet_number: "WLT88800001",
                  user_id: "user-123",
                },
                error: null,
              }),
            }),
          }),
        }),
      });
    });

    it("should reject transfer when sender has zero balance", async () => {
      // Mock wallet with zero balance
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "wallet-123",
                  balance: 0,
                  wallet_number: "WLT88800001",
                  user_id: "user-123",
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      balanceService.validateTransferBalance.mockResolvedValue({
        valid: false,
        currentBalance: 0,
        fee: 5,
        totalRequired: 105,
        message: "Insufficient balance. Required: KES 105.00 (Amount: KES 100.00 + Fee: KES 5.00), Available: KES 0.00, Shortfall: KES 105.00",
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("INSUFFICIENT_BALANCE");
      expect(result.message).toContain("Insufficient balance");
    });

    it("should handle exact balance match (balance = amount + fee)", async () => {
      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      // Balance is exactly 105 (100 + 5 fee)
      balanceService.validateTransferBalance.mockResolvedValue({
        valid: true,
        currentBalance: 105,
        fee: 5,
        totalRequired: 105,
        message: "Sufficient balance for transfer",
      });

      transactionPinService.validatePin.mockResolvedValue(true);

      balanceService.deductFromSender.mockResolvedValue({
        success: true,
        newBalance: 0,
        originalBalance: 105,
      });

      balanceService.creditToRecipient.mockResolvedValue({
        success: true,
        newBalance: 600,
      });

      transactionRecorderService.createSenderRecord.mockResolvedValue({
        id: "txn-123",
        receipt_reference: "TXN-20240101-00001",
      });

      transactionRecorderService.createRecipientRecord.mockResolvedValue({
        id: "txn-124",
        receipt_reference: "TXN-20240101-00001",
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(0);
    });

    it("should reject transfer when balance is just insufficient (balance = amount + fee - 0.01)", async () => {
      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      // Balance is 104.99, need 105
      balanceService.validateTransferBalance.mockResolvedValue({
        valid: false,
        currentBalance: 104.99,
        fee: 5,
        totalRequired: 105,
        message: "Insufficient balance. Required: KES 105.00 (Amount: KES 100.00 + Fee: KES 5.00), Available: KES 104.99, Shortfall: KES 0.01",
      });

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("INSUFFICIENT_BALANCE");
      expect(result.message).toContain("Shortfall: KES 0.01");
    });

    it("should return locked account error when account is locked", async () => {
      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      balanceService.validateTransferBalance.mockResolvedValue({
        valid: true,
        currentBalance: 1000,
        fee: 5,
        totalRequired: 105,
        message: "Sufficient balance for transfer",
      });

      // Mock locked account error
      transactionPinService.validatePin.mockRejectedValue(
        new Error("Account locked due to too many failed attempts. Try again later.")
      );

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("ACCOUNT_LOCKED");
      expect(result.message).toBe("Account locked due to too many failed attempts. Try again later.");
    });

    it("should not fail transfer when commission calculation fails", async () => {
      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      balanceService.validateTransferBalance.mockResolvedValue({
        valid: true,
        currentBalance: 1000,
        fee: 5,
        totalRequired: 105,
        message: "Sufficient balance for transfer",
      });

      transactionPinService.validatePin.mockResolvedValue(true);

      balanceService.deductFromSender.mockResolvedValue({
        success: true,
        newBalance: 895,
        originalBalance: 1000,
      });

      balanceService.creditToRecipient.mockResolvedValue({
        success: true,
        newBalance: 600,
      });

      transactionRecorderService.createSenderRecord.mockResolvedValue({
        id: "txn-123",
        receipt_reference: "TXN-20240101-00001",
      });

      transactionRecorderService.createRecipientRecord.mockResolvedValue({
        id: "txn-124",
        receipt_reference: "TXN-20240101-00001",
      });

      // Mock commission calculation failure
      (supabase.rpc as any).mockRejectedValue(new Error("Commission calculation failed"));

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
        agentId: "agent-123",
      });

      // Transfer should still succeed despite commission failure
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("txn-123");
    });

    it("should not fail transfer when transaction record creation fails", async () => {
      walletValidatorService.validateRecipient.mockResolvedValue({
        valid: true,
      });

      walletValidatorService.getWalletDetails.mockResolvedValue({
        id: "wallet-456",
        wallet_number: "WLT88812345",
        user_id: "user-456",
        balance: 500,
        full_name: "John Doe",
      });

      balanceService.validateTransferBalance.mockResolvedValue({
        valid: true,
        currentBalance: 1000,
        fee: 5,
        totalRequired: 105,
        message: "Sufficient balance for transfer",
      });

      transactionPinService.validatePin.mockResolvedValue(true);

      balanceService.deductFromSender.mockResolvedValue({
        success: true,
        newBalance: 895,
        originalBalance: 1000,
      });

      balanceService.creditToRecipient.mockResolvedValue({
        success: true,
        newBalance: 600,
      });

      // Mock transaction record creation failure
      transactionRecorderService.createSenderRecord.mockRejectedValue(
        new Error("Failed to create transaction record")
      );

      transactionRecorderService.createRecipientRecord.mockRejectedValue(
        new Error("Failed to create transaction record")
      );

      const result = await transferService.executeTransfer({
        recipientWalletNumber: "WLT88812345",
        amount: 100,
        pin: "1234",
      });

      // Transfer should still succeed despite record creation failure
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(895);
      // Transaction ID and receipt reference will be undefined due to failure
      expect(result.transactionId).toBeUndefined();
      expect(result.receiptReference).toBeUndefined();
    });
  });
});
