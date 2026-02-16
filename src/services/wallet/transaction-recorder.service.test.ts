import { describe, it, expect, beforeEach, vi } from "vitest";
import { transactionRecorderService } from "./transaction-recorder.service";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("Transaction Recorder Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateReceiptReferenceFormat", () => {
    it("should accept valid receipt reference format", () => {
      const validReferences = [
        "TXN-20240101-00001",
        "TXN-20231231-99999",
        "TXN-19990101-00000",
        "TXN-20250615-12345",
      ];

      validReferences.forEach((ref) => {
        expect(transactionRecorderService.validateReceiptReferenceFormat(ref)).toBe(true);
      });
    });

    it("should reject invalid receipt reference formats", () => {
      const invalidReferences = [
        "TXN-2024010-00001", // 7 digits in date
        "TXN-202401011-00001", // 9 digits in date
        "TXN-20240101-0001", // 4 digits in sequence
        "TXN-20240101-000001", // 6 digits in sequence
        "TXN20240101-00001", // Missing dash after TXN
        "TXN-20240101_00001", // Underscore instead of dash
        "TRX-20240101-00001", // Wrong prefix
        "txn-20240101-00001", // Lowercase
        "TXN-20240101-ABCDE", // Letters in sequence
        "", // Empty string
        "TXN-20240101", // Missing sequence
        "20240101-00001", // Missing prefix
      ];

      invalidReferences.forEach((ref) => {
        expect(transactionRecorderService.validateReceiptReferenceFormat(ref)).toBe(false);
      });
    });
  });

  describe("verifyReceiptReferenceUniqueness", () => {
    it("should return true if receipt reference does not exist", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as any) = mockFrom;

      const result = await transactionRecorderService.verifyReceiptReferenceUniqueness(
        "TXN-20240101-00001"
      );

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("transactions");
      expect(mockSelect).toHaveBeenCalledWith("id");
      expect(mockEq).toHaveBeenCalledWith("receipt_reference", "TXN-20240101-00001");
    });

    it("should return false if receipt reference already exists", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: "tx-123" }, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as any) = mockFrom;

      const result = await transactionRecorderService.verifyReceiptReferenceUniqueness(
        "TXN-20240101-00001"
      );

      expect(result).toBe(false);
    });

    it("should throw error if database query fails", async () => {
      const mockError = { message: "Database error" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as any) = mockFrom;

      await expect(
        transactionRecorderService.verifyReceiptReferenceUniqueness("TXN-20240101-00001")
      ).rejects.toThrow("Failed to verify receipt reference uniqueness: Database error");
    });
  });

  describe("validateReceiptReference", () => {
    it("should return valid: true for valid and unique receipt reference", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as any) = mockFrom;

      const result = await transactionRecorderService.validateReceiptReference(
        "TXN-20240101-00001"
      );

      expect(result).toEqual({ valid: true });
    });

    it("should return error for invalid format", async () => {
      const result = await transactionRecorderService.validateReceiptReference(
        "INVALID-FORMAT"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid receipt reference format");
    });

    it("should return error for duplicate receipt reference", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: "tx-123" }, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as any) = mockFrom;

      const result = await transactionRecorderService.validateReceiptReference(
        "TXN-20240101-00001"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("createSenderRecord", () => {
    it("should create sender transaction with negative amount and fee", async () => {
      const mockData = {
        id: "tx-123",
        receipt_reference: "TXN-20240101-00001",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
        description: "Test transfer",
        agentId: "agent-123",
      };

      const result = await transactionRecorderService.createSenderRecord(params);

      expect(mockFrom).toHaveBeenCalledWith("transactions");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: params.userId,
        wallet_id: params.walletId,
        type: "send_money",
        amount: -1000, // Negative for debit
        fee: 10,
        balance_after: 500,
        description: "Test transfer",
        reference: "WLT8880001",
        status: "completed",
        agent_id: "agent-123",
      });
      expect(result).toEqual(mockData);
    });

    it("should use default description if not provided", async () => {
      const mockData = {
        id: "tx-123",
        receipt_reference: "TXN-20240101-00001",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      await transactionRecorderService.createSenderRecord(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Sent to WLT8880001",
        })
      );
    });

    it("should set agent_id to null if not provided", async () => {
      const mockData = {
        id: "tx-123",
        receipt_reference: "TXN-20240101-00001",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      await transactionRecorderService.createSenderRecord(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: null,
        })
      );
    });

    it("should throw error if database insert fails", async () => {
      const mockError = { message: "Database error" };
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      await expect(
        transactionRecorderService.createSenderRecord(params)
      ).rejects.toThrow("Failed to create sender transaction record: Database error");
    });

    it("should throw error if no data returned", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      await expect(
        transactionRecorderService.createSenderRecord(params)
      ).rejects.toThrow("No data returned from sender transaction creation");
    });

    it("should validate receipt reference format after creation", async () => {
      const mockData = {
        id: "tx-123",
        receipt_reference: "INVALID-FORMAT",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      await expect(
        transactionRecorderService.createSenderRecord(params)
      ).rejects.toThrow("Generated receipt reference has invalid format");
    });

    it("should accept valid receipt reference format", async () => {
      const mockData = {
        id: "tx-123",
        receipt_reference: "TXN-20240101-00001",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 500,
        recipientWalletNumber: "WLT8880001",
      };

      const result = await transactionRecorderService.createSenderRecord(params);

      expect(result.receipt_reference).toBe("TXN-20240101-00001");
    });
  });

  describe("createRecipientRecord", () => {
    it("should create recipient transaction with positive amount and zero fee", async () => {
      const mockData = {
        id: "tx-456",
        receipt_reference: "TXN-20240101-00002",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
        description: "Test receipt",
      };

      const result = await transactionRecorderService.createRecipientRecord(params);

      expect(mockFrom).toHaveBeenCalledWith("transactions");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: params.userId,
        wallet_id: params.walletId,
        type: "receive_money",
        amount: 1000, // Positive for credit
        fee: 0, // No fee for recipient
        balance_after: 2000,
        description: "Test receipt",
        reference: "WLT8880002",
        status: "completed",
      });
      expect(result).toEqual(mockData);
    });

    it("should use default description if not provided", async () => {
      const mockData = {
        id: "tx-456",
        receipt_reference: "TXN-20240101-00002",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
      };

      await transactionRecorderService.createRecipientRecord(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Received from WLT8880002",
        })
      );
    });

    it("should throw error if database insert fails", async () => {
      const mockError = { message: "Database error" };
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
      };

      await expect(
        transactionRecorderService.createRecipientRecord(params)
      ).rejects.toThrow("Failed to create recipient transaction record: Database error");
    });

    it("should throw error if no data returned", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
      };

      await expect(
        transactionRecorderService.createRecipientRecord(params)
      ).rejects.toThrow("No data returned from recipient transaction creation");
    });

    it("should validate receipt reference format after creation", async () => {
      const mockData = {
        id: "tx-456",
        receipt_reference: "INVALID-FORMAT",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
      };

      await expect(
        transactionRecorderService.createRecipientRecord(params)
      ).rejects.toThrow("Generated receipt reference has invalid format");
    });

    it("should accept valid receipt reference format", async () => {
      const mockData = {
        id: "tx-456",
        receipt_reference: "TXN-20240101-00002",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-456",
        walletId: "wallet-456",
        amount: 1000,
        balanceAfter: 2000,
        senderWalletNumber: "WLT8880002",
      };

      const result = await transactionRecorderService.createRecipientRecord(params);

      expect(result.receipt_reference).toBe("TXN-20240101-00002");
    });
  });

  describe("Edge cases", () => {
    it("should handle large amounts correctly", async () => {
      const mockData = {
        id: "tx-789",
        receipt_reference: "TXN-20240101-00003",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 999999.99,
        fee: 50,
        balanceAfter: 100000.01,
        recipientWalletNumber: "WLT8880001",
      };

      await transactionRecorderService.createSenderRecord(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: -999999.99,
          fee: 50,
        })
      );
    });

    it("should handle zero balance_after correctly", async () => {
      const mockData = {
        id: "tx-789",
        receipt_reference: "TXN-20240101-00003",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      (supabase.from as any) = mockFrom;

      const params = {
        userId: "user-123",
        walletId: "wallet-123",
        amount: 1000,
        fee: 10,
        balanceAfter: 0,
        recipientWalletNumber: "WLT8880001",
      };

      await transactionRecorderService.createSenderRecord(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          balance_after: 0,
        })
      );
    });
  });
});
