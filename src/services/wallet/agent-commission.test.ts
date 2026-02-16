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

describe("Agent Commission Recording - Task 13.1", () => {
  let walletValidatorService: any;
  let balanceService: any;
  let transactionPinService: any;
  let transactionRecorderService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get references to the mocked modules
    walletValidatorService = (await import("./wallet-validator.service")).walletValidatorService;
    balanceService = (await import("../payment/balance.service")).balanceService;
    transactionPinService = (await import("../transaction-pin.service")).transactionPinService;
    transactionRecorderService = (await import("./transaction-recorder.service")).transactionRecorderService;

    // Setup common mocks
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
  });

  /**
   * Requirement 7.1: Call calculate_and_credit_commission when agent_id provided
   */
  it("should call calculate_and_credit_commission when agent_id is provided", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 100,
      pin: "1234",
      agentId: "agent-123",
    });

    // Verify calculate_and_credit_commission was called
    expect(mockRpc).toHaveBeenCalledWith("calculate_and_credit_commission", {
      p_transaction_id: "txn-123",
      p_transaction_type: "send_money",
      p_amount: 100,
      p_agent_id: "agent-123",
    });
  });

  /**
   * Requirement 7.2: Pass correct parameters to calculate_and_credit_commission
   */
  it("should pass correct parameters: transaction_id, 'send_money', amount, agent_id", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 250.50,
      pin: "1234",
      agentId: "agent-456",
    });

    // Verify all parameters are correct
    expect(mockRpc).toHaveBeenCalledWith("calculate_and_credit_commission", {
      p_transaction_id: "txn-123",
      p_transaction_type: "send_money",
      p_amount: 250.50,
      p_agent_id: "agent-456",
    });
  });

  /**
   * Requirement 7.3: Isolate commission failures (don't fail transfer)
   */
  it("should not fail transfer when commission calculation fails", async () => {
    const mockRpc = vi.fn().mockRejectedValue(new Error("Commission calculation failed"));
    (supabase.rpc as any) = mockRpc;

    const result = await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 100,
      pin: "1234",
      agentId: "agent-123",
    });

    // Transfer should succeed despite commission failure
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("txn-123");
    expect(result.receiptReference).toBe("TXN-20240101-00001");
    expect(result.newBalance).toBe(895);
  });

  /**
   * Requirement 7.4: Update sender transaction record with agent_id and commission_amount
   * Note: The commission_amount is updated by the database function, but agent_id
   * should be passed to createSenderRecord
   */
  it("should pass agent_id to createSenderRecord", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 100,
      pin: "1234",
      agentId: "agent-789",
    });

    // Verify agent_id was passed to createSenderRecord
    expect(transactionRecorderService.createSenderRecord).toHaveBeenCalledWith({
      userId: "user-123",
      walletId: "wallet-123",
      amount: 100,
      fee: 5,
      balanceAfter: 895,
      recipientWalletNumber: "WLT88812345",
      description: undefined,
      agentId: "agent-789",
    });
  });

  /**
   * Verify that commission is NOT called when agent_id is not provided
   */
  it("should not call calculate_and_credit_commission when agent_id is not provided", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 100,
      pin: "1234",
      // No agentId provided
    });

    // Verify calculate_and_credit_commission was NOT called
    expect(mockRpc).not.toHaveBeenCalled();
  });

  /**
   * Verify that commission is NOT called when transaction record creation fails
   */
  it("should not call calculate_and_credit_commission when sender transaction creation fails", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    // Mock transaction record creation failure
    transactionRecorderService.createSenderRecord.mockRejectedValue(
      new Error("Failed to create transaction record")
    );

    await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 100,
      pin: "1234",
      agentId: "agent-123",
    });

    // Verify calculate_and_credit_commission was NOT called (no transaction ID)
    expect(mockRpc).not.toHaveBeenCalled();
  });

  /**
   * Integration test: Verify complete flow with agent commission
   */
  it("should complete full transfer flow with agent commission", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;

    const result = await transferService.executeTransfer({
      recipientWalletNumber: "WLT88812345",
      amount: 500,
      description: "Payment for services",
      pin: "1234",
      agentId: "agent-999",
    });

    // Verify transfer succeeded
    expect(result.success).toBe(true);
    expect(result.message).toContain("Successfully sent KES 500.00");
    expect(result.transactionId).toBe("txn-123");
    expect(result.receiptReference).toBe("TXN-20240101-00001");
    expect(result.newBalance).toBe(895);

    // Verify all services were called correctly
    expect(balanceService.deductFromSender).toHaveBeenCalledWith("wallet-123", 500, 5);
    expect(balanceService.creditToRecipient).toHaveBeenCalledWith("wallet-456", 500);
    
    // Verify sender record includes agent_id
    expect(transactionRecorderService.createSenderRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-999",
        amount: 500,
        fee: 5,
      })
    );

    // Verify commission was calculated
    expect(mockRpc).toHaveBeenCalledWith("calculate_and_credit_commission", {
      p_transaction_id: "txn-123",
      p_transaction_type: "send_money",
      p_amount: 500,
      p_agent_id: "agent-999",
    });
  });
});
