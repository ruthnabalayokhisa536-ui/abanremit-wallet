import { describe, it, expect, beforeEach, vi } from "vitest";
import { walletValidatorService } from "./wallet-validator.service";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("Wallet Validator Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFormat", () => {
    it("should accept valid user wallet numbers (WLT888xxxxx)", () => {
      expect(walletValidatorService.validateFormat("WLT88800001")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT88800000")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT88899999")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT88812345")).toBe(true);
    });

    it("should accept valid agent wallet numbers (WLT777xxxxx)", () => {
      expect(walletValidatorService.validateFormat("WLT77700001")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT77700000")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT77799999")).toBe(true);
      expect(walletValidatorService.validateFormat("WLT77712345")).toBe(true);
    });

    it("should reject invalid wallet number formats", () => {
      expect(walletValidatorService.validateFormat("WLT888")).toBe(false);
      expect(walletValidatorService.validateFormat("WLT777")).toBe(false);
      expect(walletValidatorService.validateFormat("WLT8881234")).toBe(false); // Too few digits
      expect(walletValidatorService.validateFormat("WLT888123456")).toBe(false); // Too many digits
      expect(walletValidatorService.validateFormat("WLT888abcde")).toBe(false); // Non-numeric
      expect(walletValidatorService.validateFormat("wlt88800001")).toBe(false); // Wrong case
      expect(walletValidatorService.validateFormat("WLT88800001 ")).toBe(false); // Trailing space
      expect(walletValidatorService.validateFormat(" WLT88800001")).toBe(false); // Leading space
      expect(walletValidatorService.validateFormat("")).toBe(false); // Empty string
      expect(walletValidatorService.validateFormat("WLT99900001")).toBe(false); // Invalid prefix
    });
  });

  describe("validateExists", () => {
    it("should return valid result with name when wallet exists", async () => {
      const mockData = {
        wallet_number: "WLT88800001",
        user_id: "user-123",
        profiles: { full_name: "John Doe" },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateExists("WLT88800001");

      expect(result.valid).toBe(true);
      expect(result.name).toBe("John Doe");
      expect(result.error).toBeUndefined();
    });

    it("should return error when wallet does not exist", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateExists("WLT88800001");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Recipient wallet not found. Please check the wallet number.");
    });

    it("should return error for invalid format", async () => {
      const result = await walletValidatorService.validateExists("INVALID");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid wallet number format");
    });

    it("should handle database errors gracefully", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateExists("WLT88800001");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Error validating wallet");
    });
  });

  describe("getWalletDetails", () => {
    it("should return wallet details when wallet exists", async () => {
      const mockData = {
        id: "wallet-123",
        wallet_number: "WLT88800001",
        user_id: "user-123",
        balance: 1000.50,
        profiles: { full_name: "John Doe" },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.getWalletDetails("WLT88800001");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("wallet-123");
      expect(result?.wallet_number).toBe("WLT88800001");
      expect(result?.user_id).toBe("user-123");
      expect(result?.balance).toBe(1000.50);
      expect(result?.full_name).toBe("John Doe");
    });

    it("should return null when wallet does not exist", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.getWalletDetails("WLT88800001");

      expect(result).toBeNull();
    });

    it("should return null for invalid format", async () => {
      const result = await walletValidatorService.getWalletDetails("INVALID");

      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.getWalletDetails("WLT88800001");

      expect(result).toBeNull();
    });
  });

  describe("isSelfTransfer", () => {
    it("should return true when sender and recipient IDs are the same", () => {
      const result = walletValidatorService.isSelfTransfer("wallet-123", "wallet-123");
      expect(result).toBe(true);
    });

    it("should return false when sender and recipient IDs are different", () => {
      const result = walletValidatorService.isSelfTransfer("wallet-123", "wallet-456");
      expect(result).toBe(false);
    });
  });

  describe("validateRecipient", () => {
    it("should return valid result when recipient is different from sender", async () => {
      const mockData = {
        wallet_number: "WLT88800002",
        user_id: "user-456",
        profiles: { full_name: "Jane Smith" },
      };

      const mockDetailsData = {
        id: "wallet-456",
        wallet_number: "WLT88800002",
        user_id: "user-456",
        balance: 500.00,
        profiles: { full_name: "Jane Smith" },
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDetailsData, error: null }),
          }),
        });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateRecipient("WLT88800002", "wallet-123");

      expect(result.valid).toBe(true);
      expect(result.name).toBe("Jane Smith");
      expect(result.error).toBeUndefined();
    });

    it("should return error when trying to send to self", async () => {
      const mockData = {
        wallet_number: "WLT88800001",
        user_id: "user-123",
        profiles: { full_name: "John Doe" },
      };

      const mockDetailsData = {
        id: "wallet-123",
        wallet_number: "WLT88800001",
        user_id: "user-123",
        balance: 1000.00,
        profiles: { full_name: "John Doe" },
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDetailsData, error: null }),
          }),
        });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateRecipient("WLT88800001", "wallet-123");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Cannot send money to yourself");
    });

    it("should return error when recipient wallet does not exist", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateRecipient("WLT88800999", "wallet-123");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Recipient wallet not found. Please check the wallet number.");
    });
  });

  describe("Edge Cases", () => {
    it("should handle wallet with missing profile name", async () => {
      const mockData = {
        wallet_number: "WLT88800001",
        user_id: "user-123",
        profiles: { full_name: null },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.validateExists("WLT88800001");

      expect(result.valid).toBe(true);
      expect(result.name).toBe("Unknown");
    });

    it("should handle zero balance wallet", async () => {
      const mockData = {
        id: "wallet-123",
        wallet_number: "WLT88800001",
        user_id: "user-123",
        balance: 0,
        profiles: { full_name: "John Doe" },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await walletValidatorService.getWalletDetails("WLT88800001");

      expect(result).not.toBeNull();
      expect(result?.balance).toBe(0);
    });
  });
});
