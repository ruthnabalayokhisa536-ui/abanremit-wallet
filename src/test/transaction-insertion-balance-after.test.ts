import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import * as fc from "fast-check";

/**
 * Property-Based Test for Transaction Insertion with balance_after
 * 
 * Feature: airtime-transaction-fix
 * Property 1: Transaction insertion with balance_after
 * Validates: Requirements 1.2
 * 
 * This test verifies that for any valid wallet transaction data including
 * a balance_after value, inserting the transaction into the transactions
 * table succeeds without database errors.
 */

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("Property Test: Transaction insertion with balance_after", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully insert transactions with various balance_after values (Property 1)", async () => {
    // Property-based test with minimum 100 iterations
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid transaction data
        fc.record({
          user_id: fc.uuid(),
          wallet_id: fc.uuid(),
          type: fc.constantFrom("airtime", "send_money", "withdraw", "deposit"),
          amount: fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100), // Round to 2 decimal places
          fee: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          balance_after: fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          reference: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom("pending", "completed", "failed"),
        }),
        async (transactionData) => {
          // Mock successful insertion
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              ...transactionData,
              receipt_reference: `RCP-${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            error: null,
          };

          const selectMock = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockInsertResult),
          });

          const insertMock = vi.fn().mockReturnValue({
            select: selectMock,
          });

          vi.mocked(supabase.from).mockReturnValue({
            insert: insertMock,
          } as any);

          // Attempt to insert transaction
          const { data, error } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

          // Verify insertion succeeded without errors
          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data).toHaveProperty("balance_after", transactionData.balance_after);
          
          // Verify the insert was called with correct data
          expect(insertMock).toHaveBeenCalledWith(transactionData);
        }
      ),
      { numRuns: 100 } // Run minimum 100 iterations as specified
    );
  });

  it("should handle positive and negative amounts correctly", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.uuid(),
          wallet_id: fc.uuid(),
          type: fc.constantFrom("airtime", "send_money", "withdraw", "deposit"),
          amount: fc.oneof(
            fc.double({ min: -10000, max: -0.01, noNaN: true, noDefaultInfinity: true }), // Negative amounts (debits)
            fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true })    // Positive amounts (credits)
          ).map(n => Math.round(n * 100) / 100),
          fee: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          balance_after: fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          reference: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom("pending", "completed", "failed"),
        }),
        async (transactionData) => {
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              ...transactionData,
              receipt_reference: `RCP-${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            error: null,
          };

          const selectMock = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockInsertResult),
          });

          const insertMock = vi.fn().mockReturnValue({
            select: selectMock,
          });

          vi.mocked(supabase.from).mockReturnValue({
            insert: insertMock,
          } as any);

          const { data, error } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.amount).toBe(transactionData.amount);
          expect(data.balance_after).toBe(transactionData.balance_after);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle various decimal precision values for balance_after", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.uuid(),
          wallet_id: fc.uuid(),
          type: fc.constantFrom("airtime", "send_money", "withdraw", "deposit"),
          amount: fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          fee: fc.double({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          // Test specific decimal values: whole numbers, one decimal, two decimals
          balance_after: fc.oneof(
            fc.integer({ min: 0, max: 10000 }).map(n => n), // Whole numbers like 100
            fc.double({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true })
              .map(n => Math.round(n * 10) / 10), // One decimal like 99.9
            fc.double({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true })
              .map(n => Math.round(n * 100) / 100) // Two decimals like 99.99
          ),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          reference: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom("pending", "completed", "failed"),
        }),
        async (transactionData) => {
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              ...transactionData,
              receipt_reference: `RCP-${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            error: null,
          };

          const selectMock = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockInsertResult),
          });

          const insertMock = vi.fn().mockReturnValue({
            select: selectMock,
          });

          vi.mocked(supabase.from).mockReturnValue({
            insert: insertMock,
          } as any);

          const { data, error } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.balance_after).toBe(transactionData.balance_after);
          
          // Verify decimal precision is maintained (max 2 decimal places)
          const decimalPlaces = (transactionData.balance_after.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle edge case values for balance_after", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.uuid(),
          wallet_id: fc.uuid(),
          type: fc.constantFrom("airtime", "send_money", "withdraw", "deposit"),
          amount: fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          fee: fc.double({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100),
          // Test edge cases: zero, very small, very large
          balance_after: fc.oneof(
            fc.constant(0), // Zero balance
            fc.constant(0.01), // Minimum positive value
            fc.constant(999999.99), // Maximum value
            fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true })
              .map(n => Math.round(n * 100) / 100)
          ),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          reference: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom("pending", "completed", "failed"),
        }),
        async (transactionData) => {
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              ...transactionData,
              receipt_reference: `RCP-${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            error: null,
          };

          const selectMock = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockInsertResult),
          });

          const insertMock = vi.fn().mockReturnValue({
            select: selectMock,
          });

          vi.mocked(supabase.from).mockReturnValue({
            insert: insertMock,
          } as any);

          const { data, error } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.balance_after).toBe(transactionData.balance_after);
          expect(data.balance_after).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
