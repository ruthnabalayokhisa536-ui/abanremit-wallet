import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWallet } from "@/hooks/use-wallet";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn()
          }))
        }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

describe("useWallet - User ID Validation (Task 4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("should accept wallet data when user_id matches authenticated user", async () => {
    const mockUserId = "test-user-123";
    const mockWallet = {
      id: "wallet-1",
      wallet_id: "WLT88800001",
      balance: 1000,
      status: "active",
      user_id: mockUserId,
      transaction_pin: "hashed_pin"
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });

    // Mock wallet query returning matching user_id
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: mockWallet,
      error: null
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wallet should be set when user_id matches
    expect(result.current.wallet).toEqual(mockWallet);
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining("SECURITY")
    );
  });

  it("should reject wallet data when user_id does NOT match authenticated user", async () => {
    const authenticatedUserId = "test-user-123";
    const wrongUserId = "different-user-456";
    const mockWallet = {
      id: "wallet-1",
      wallet_id: "WLT88800002",
      balance: 2000,
      status: "active",
      user_id: wrongUserId, // MISMATCH!
      transaction_pin: "hashed_pin"
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: authenticatedUserId } as any },
      error: null
    });

    // Mock wallet query returning WRONG user_id
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: mockWallet,
      error: null
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wallet should be NULL when user_id doesn't match
    expect(result.current.wallet).toBeNull();
    
    // Security error should be logged
    expect(console.error).toHaveBeenCalledWith(
      "[useWallet] SECURITY: Wallet user_id mismatch!",
      expect.objectContaining({
        expected: authenticatedUserId,
        received: wrongUserId,
        timestamp: expect.any(String)
      })
    );
  });

  it("should handle null wallet data gracefully", async () => {
    const mockUserId = "test-user-123";

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });

    // Mock wallet query returning null (no wallet found)
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wallet should be null (no data found)
    expect(result.current.wallet).toBeNull();
    
    // No security error should be logged for null data
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining("SECURITY")
    );
  });

  it("should handle database errors gracefully", async () => {
    const mockUserId = "test-user-123";

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });

    // Mock wallet query returning error
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" }
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wallet should be null on error
    expect(result.current.wallet).toBeNull();
    
    // Error should be logged
    expect(console.error).toHaveBeenCalledWith(
      "[useWallet] Error fetching wallet:",
      expect.objectContaining({ message: "Database connection failed" })
    );
  });

  it("should validate user_id in refetch method", async () => {
    const authenticatedUserId = "test-user-123";
    const wrongUserId = "different-user-456";
    const mockWallet = {
      id: "wallet-1",
      wallet_id: "WLT88800001",
      balance: 1000,
      status: "active",
      user_id: authenticatedUserId
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: authenticatedUserId } as any },
      error: null
    });

    // First call returns correct data
    const maybeSingleMock = vi.fn()
      .mockResolvedValueOnce({
        data: mockWallet,
        error: null
      })
      // Second call (refetch) returns wrong user_id
      .mockResolvedValueOnce({
        data: { ...mockWallet, user_id: wrongUserId },
        error: null
      });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial wallet should be set
    expect(result.current.wallet).toEqual(mockWallet);

    // Clear previous console.error calls
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Call refetch which should return wrong user_id
    await result.current.refetch();

    await waitFor(() => {
      // Wallet should be set to null due to mismatch
      expect(result.current.wallet).toBeNull();
    });

    // Security error should be logged
    expect(console.error).toHaveBeenCalledWith(
      "[useWallet] SECURITY: Wallet user_id mismatch on refetch!",
      expect.objectContaining({
        expected: authenticatedUserId,
        received: wrongUserId,
        timestamp: expect.any(String)
      })
    );
  });
});
