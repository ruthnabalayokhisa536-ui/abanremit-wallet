import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "@/hooks/use-profile";
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

describe("useProfile - User ID Validation (Task 3.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should accept profile data when user_id matches authenticated user", async () => {
    const mockUserId = "test-user-123";
    const mockProfile = {
      id: "profile-1",
      user_id: mockUserId,
      full_name: "Test User",
      phone: "254700000001",
      email: "test@example.com",
      kyc_status: "pending",
      profile_photo_url: null
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });

    // Mock profile query returning matching user_id
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: mockProfile,
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

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile should be set when user_id matches
    expect(result.current.profile).toEqual(mockProfile);
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining("SECURITY")
    );
  });

  it("should reject profile data when user_id does NOT match authenticated user", async () => {
    const authenticatedUserId = "test-user-123";
    const wrongUserId = "different-user-456";
    const mockProfile = {
      id: "profile-1",
      user_id: wrongUserId, // MISMATCH!
      full_name: "Wrong User",
      phone: "254700000002",
      email: "wrong@example.com",
      kyc_status: "pending",
      profile_photo_url: null
    };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: authenticatedUserId } as any },
      error: null
    });

    // Mock profile query returning WRONG user_id
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: mockProfile,
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

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile should be NULL when user_id doesn't match
    expect(result.current.profile).toBeNull();
    
    // Security error should be logged
    expect(console.error).toHaveBeenCalledWith(
      "[useProfile] SECURITY: Profile user_id mismatch!",
      expect.objectContaining({
        expected: authenticatedUserId,
        received: wrongUserId,
        timestamp: expect.any(String)
      })
    );
  });

  it("should handle null profile data gracefully", async () => {
    const mockUserId = "test-user-123";

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });

    // Mock profile query returning null (no profile found)
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

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile should be null (no data found)
    expect(result.current.profile).toBeNull();
    
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

    // Mock profile query returning error
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

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile should be null on error
    expect(result.current.profile).toBeNull();
    
    // Error should be logged
    expect(console.error).toHaveBeenCalledWith(
      "[useProfile] Error fetching profile:",
      expect.objectContaining({ message: "Database connection failed" })
    );
  });
});
