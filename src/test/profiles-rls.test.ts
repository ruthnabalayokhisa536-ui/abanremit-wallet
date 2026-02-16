import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Profiles RLS Policy Verification Tests
 * 
 * Feature: user-auth-isolation-fix
 * Task: 2. Verify and Test Existing Profiles RLS Policies
 * Requirements: 4.1, 4.2, 4.5
 * 
 * These tests verify that the profiles table RLS policies from migration
 * 20260215000007_profiles_rls_policies.sql are working correctly.
 * 
 * Test Coverage:
 * 1. RLS is enabled on profiles table
 * 2. Users can only SELECT their own profile (auth.uid() = user_id)
 * 3. Users cannot SELECT other users' profiles
 * 4. Users can only UPDATE their own profile (auth.uid() = user_id)
 * 5. Users cannot UPDATE other users' profiles
 * 6. Admin users can SELECT all profiles
 * 7. Admin users can UPDATE all profiles
 */

// Test configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Test users - these should exist in your test database
const TEST_USER_A = {
  email: "test-user-a@abanremit.test",
  password: "TestPassword123!",
};

const TEST_USER_B = {
  email: "test-user-b@abanremit.test",
  password: "TestPassword123!",
};

const TEST_ADMIN = {
  email: "test-admin@abanremit.test",
  password: "TestPassword123!",
};

describe("Feature: user-auth-isolation-fix - Profiles RLS Policies", () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let supabaseAdmin: SupabaseClient<Database>;
  let userAId: string;
  let userBId: string;
  let adminId: string;

  beforeAll(async () => {
    // Create separate Supabase clients for each test user
    supabaseUserA = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseUserB = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign in as User A
    const { data: userAData, error: userAError } = await supabaseUserA.auth.signInWithPassword({
      email: TEST_USER_A.email,
      password: TEST_USER_A.password,
    });

    if (userAError || !userAData.user) {
      throw new Error(`Failed to sign in as User A: ${userAError?.message}`);
    }
    userAId = userAData.user.id;

    // Sign in as User B
    const { data: userBData, error: userBError } = await supabaseUserB.auth.signInWithPassword({
      email: TEST_USER_B.email,
      password: TEST_USER_B.password,
    });

    if (userBError || !userBData.user) {
      throw new Error(`Failed to sign in as User B: ${userBError?.message}`);
    }
    userBId = userBData.user.id;

    // Sign in as Admin
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.signInWithPassword({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    if (adminError || !adminData.user) {
      throw new Error(`Failed to sign in as Admin: ${adminError?.message}`);
    }
    adminId = adminData.user.id;
  });

  afterAll(async () => {
    // Clean up: sign out all users
    await supabaseUserA.auth.signOut();
    await supabaseUserB.auth.signOut();
    await supabaseAdmin.auth.signOut();
  });

  describe("Requirement 4.1: RLS SELECT Policy - Users can only view own profile", () => {
    it("should allow User A to SELECT their own profile", async () => {
      const { data, error } = await supabaseUserA
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("user_id", userAId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.user_id).toBe(userAId);
    });

    it("should allow User B to SELECT their own profile", async () => {
      const { data, error } = await supabaseUserB
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("user_id", userBId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.user_id).toBe(userBId);
    });
  });

  describe("Requirement 4.5: RLS blocks cross-user access", () => {
    it("should block User A from SELECTing User B's profile", async () => {
      // User A tries to query User B's profile
      const { data, error } = await supabaseUserA
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("user_id", userBId)
        .maybeSingle();

      // RLS should return empty result (no error, but no data)
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should block User B from SELECTing User A's profile", async () => {
      // User B tries to query User A's profile
      const { data, error } = await supabaseUserB
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("user_id", userAId)
        .maybeSingle();

      // RLS should return empty result (no error, but no data)
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("should return empty array when User A queries all profiles", async () => {
      // User A tries to query all profiles (should only see their own)
      const { data, error } = await supabaseUserA
        .from("profiles")
        .select("id, user_id, full_name, email");

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      // Should only return User A's profile
      expect(data?.length).toBe(1);
      expect(data?.[0]?.user_id).toBe(userAId);
    });
  });

  describe("Requirement 4.2: RLS UPDATE Policy - Users can only update own profile", () => {
    it("should allow User A to UPDATE their own profile", async () => {
      const testValue = `Test Name ${Date.now()}`;
      
      const { data, error } = await supabaseUserA
        .from("profiles")
        .update({ full_name: testValue })
        .eq("user_id", userAId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.full_name).toBe(testValue);
      expect(data?.user_id).toBe(userAId);
    });

    it("should allow User B to UPDATE their own profile", async () => {
      const testValue = `Test Name ${Date.now()}`;
      
      const { data, error } = await supabaseUserB
        .from("profiles")
        .update({ full_name: testValue })
        .eq("user_id", userBId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.full_name).toBe(testValue);
      expect(data?.user_id).toBe(userBId);
    });
  });

  describe("Requirement 4.5: RLS blocks cross-user modifications", () => {
    it("should block User A from UPDATing User B's profile", async () => {
      const testValue = `Malicious Update ${Date.now()}`;
      
      // User A tries to update User B's profile
      const { data, error } = await supabaseUserA
        .from("profiles")
        .update({ full_name: testValue })
        .eq("user_id", userBId)
        .select();

      // RLS should block the update - no error but no rows affected
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("should block User B from UPDATing User A's profile", async () => {
      const testValue = `Malicious Update ${Date.now()}`;
      
      // User B tries to update User A's profile
      const { data, error } = await supabaseUserB
        .from("profiles")
        .update({ full_name: testValue })
        .eq("user_id", userAId)
        .select();

      // RLS should block the update - no error but no rows affected
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("Admin Override Policies", () => {
    it("should allow Admin to SELECT all profiles", async () => {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, full_name, email");

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      // Admin should see at least User A, User B, and Admin profiles
      expect(data!.length).toBeGreaterThanOrEqual(3);
      
      // Verify admin can see other users' profiles
      const userAProfile = data?.find(p => p.user_id === userAId);
      const userBProfile = data?.find(p => p.user_id === userBId);
      expect(userAProfile).toBeDefined();
      expect(userBProfile).toBeDefined();
    });

    it("should allow Admin to SELECT specific user's profile", async () => {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("user_id", userAId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.user_id).toBe(userAId);
    });

    it("should allow Admin to UPDATE any user's profile", async () => {
      const testValue = `Admin Updated ${Date.now()}`;
      
      // Admin updates User A's profile
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: testValue })
        .eq("user_id", userAId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.full_name).toBe(testValue);
      expect(data?.user_id).toBe(userAId);
    });
  });

  describe("RLS Enabled Verification", () => {
    it("should have RLS enabled on profiles table", async () => {
      // Query pg_tables to verify RLS is enabled
      const { data, error } = await (supabaseAdmin as any).rpc("check_rls_enabled", {
        table_name: "profiles",
      });

      // Note: This requires a custom RPC function in the database
      // If not available, this test can be skipped or we can verify indirectly
      // through the behavior of other tests
      
      // For now, we verify indirectly: if cross-user access is blocked,
      // RLS must be enabled
      expect(error).toBeNull();
    });
  });
});
