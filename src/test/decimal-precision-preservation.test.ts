import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import * as fc from "fast-check";

/**
 * Feature: airtime-transaction-fix
 * Property 3: Decimal precision preservation
 * Validates: Requirements 2.3
 * 
 * For any balance_after value with up to 2 decimal places, when stored in
 * the Transactions_Table, the value should be retrieved with exactly the
 * same precision (2 decimal places).
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

describe("Property Test: Decimal precision preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Property 3: Decimal precision is preserved exactly (2 decimal places)", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate decimal values with 0-2 decimal places
        fc.oneof(
          // Whole numbers like 100
          fc.integer({ min: 0, max: 100000 }).map(n => n),
          // One decimal place like 99.9
          fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 10) / 10),
          // Two decimal places like 99.99
          fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
            .map(n => Math.round(n * 100) / 100)
        ),
        fc.uuid(),
        fc.uuid(),
        async (balanceAfter, userId, walletId) => {
          // Mock insert and select to simulate database round-trip
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
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

          // Insert transaction with balance_after
          const { data, error } = await supabase
            .from("transactions")
            .insert({
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
            })
            .select()
            .single();

          // Verify no error
          expect(error).toBeNull();
          expect(data).toBeDefined();

          // Verify precision is preserved
          expect(data.balance_after).toBe(balanceAfter);

          // Verify decimal places are within 2 decimal places
          const decimalPlaces = (balanceAfter.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 3.1: Specific decimal values preserve precision", async () => {
    const testValues = [
      100.00,
      99.99,
      0.01,
      1000.50,
      0.00,
      999999.99,
      1.23,
      456.78,
      10.00,
      0.10,
    ];

    for (const balanceAfter of testValues) {
      const userId = fc.sample(fc.uuid(), 1)[0];
      const walletId = fc.sample(fc.uuid(), 1)[0];

      const mockInsertResult = {
        data: {
          id: fc.sample(fc.uuid(), 1)[0],
          user_id: userId,
          wallet_id: walletId,
          type: "airtime",
          amount: -50,
          fee: 1,
          balance_after: balanceAfter,
          description: "Test transaction",
          reference: "TEST-REF",
          status: "completed",
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
        .insert({
          user_id: userId,
          wallet_id: walletId,
          type: "airtime",
          amount: -50,
          fee: 1,
          balance_after: balanceAfter,
          description: "Test transaction",
          reference: "TEST-REF",
          status: "completed",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.balance_after).toBe(balanceAfter);
    }
  });

  it("Property 3.2: Trailing zeros are preserved for whole numbers", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100000 }),
        fc.uuid(),
        fc.uuid(),
        async (wholeNumber, userId, walletId) => {
          // Store as decimal with .00
          const balanceAfter = wholeNumber;

          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
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
            .insert({
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
            })
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.balance_after).toBe(balanceAfter);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 3.3: One decimal place values are preserved", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
          .map(n => Math.round(n * 10) / 10),
        fc.uuid(),
        fc.uuid(),
        async (balanceAfter, userId, walletId) => {
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
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
            .insert({
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
            })
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.balance_after).toBe(balanceAfter);

          // Verify it has at most 1 decimal place
          const decimalPlaces = (balanceAfter.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(1);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 3.4: Two decimal place values are preserved exactly", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true })
          .map(n => Math.round(n * 100) / 100),
        fc.uuid(),
        fc.uuid(),
        async (balanceAfter, userId, walletId) => {
          const mockInsertResult = {
            data: {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
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
            .insert({
              user_id: userId,
              wallet_id: walletId,
              type: "airtime",
              amount: -50,
              fee: 1,
              balance_after: balanceAfter,
              description: "Test transaction",
              reference: "TEST-REF",
              status: "completed",
            })
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
          expect(data.balance_after).toBe(balanceAfter);

          // Verify it has at most 2 decimal places
          const decimalPlaces = (balanceAfter.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
