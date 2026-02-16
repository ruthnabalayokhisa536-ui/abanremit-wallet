import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// Mock the supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe("useAuth - Cache Clearing on Logout", () => {
  let authStateChangeCallback: (event: string, session: any) => void;
  let unsubscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock for onAuthStateChange
    unsubscribeMock = vi.fn();
    authStateChangeCallback = vi.fn();

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      } as any;
    });

    // Setup mock for getSession
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should clear user and session state on SIGNED_OUT event", async () => {
    const { result } = renderHook(() => useAuth());

    // Initially, user should be null
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    // Simulate a user signing in
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockSession = { user: mockUser, access_token: "token-123" };

    act(() => {
      authStateChangeCallback("SIGNED_IN", mockSession);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    // Simulate user signing out
    act(() => {
      authStateChangeCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("should log logout event when SIGNED_OUT occurs", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    renderHook(() => useAuth());

    // Simulate user signing out
    act(() => {
      authStateChangeCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[useAuth] Auth state changed:",
        "SIGNED_OUT"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[useAuth] Clearing user and session state on logout"
      );
    });

    consoleSpy.mockRestore();
  });

  it("should log when signOut is called", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(consoleSpy).toHaveBeenCalledWith("[useAuth] Signing out user");
    expect(supabase.auth.signOut).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle subsequent login after logout with fresh data", async () => {
    const { result } = renderHook(() => useAuth());

    // First user logs in
    const user1 = { id: "user-1", email: "user1@example.com" };
    const session1 = { user: user1, access_token: "token-1" };
    
    act(() => {
      authStateChangeCallback("SIGNED_IN", session1);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(user1);
    });

    // User logs out
    act(() => {
      authStateChangeCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    // Second user logs in
    const user2 = { id: "user-2", email: "user2@example.com" };
    const session2 = { user: user2, access_token: "token-2" };
    
    act(() => {
      authStateChangeCallback("SIGNED_IN", session2);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(user2);
      expect(result.current.session).toEqual(session2);
      // Verify no data from user1 is present
      expect(result.current.user?.id).not.toBe(user1.id);
    });
  });

  it("should unsubscribe from auth state changes on unmount", () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
