import { createClient } from '@supabase/supabase-js';

export interface RecoveryResult {
  success: boolean;
  message: string;
  steps: string[];
  errors?: string[];
}

export class AuthRecoveryModule {
  async verifyCredentials(url: string, anonKey: string): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Testing Supabase credentials...');
      
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.auth.getSession();

      if (error) {
        errors.push(`Credential verification failed: ${error.message}`);
        return {
          success: false,
          message: 'Credentials are invalid',
          steps,
          errors
        };
      }

      steps.push('✓ Credentials verified successfully');
      return {
        success: true,
        message: 'Credentials are valid',
        steps
      };
    } catch (error: any) {
      errors.push(`Verification error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to verify credentials',
        steps,
        errors
      };
    }
  }

  async testRLSPolicies(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !anonKey) {
        errors.push('Supabase credentials not configured');
        return {
          success: false,
          message: 'Cannot test RLS policies without credentials',
          steps,
          errors
        };
      }

      steps.push('Testing RLS policies...');
      
      const supabase = createClient(supabaseUrl, anonKey);
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session) {
        errors.push('No active session - user must be logged in to test RLS');
        return {
          success: false,
          message: 'User not authenticated',
          steps,
          errors
        };
      }

      // Test profiles table access
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profileError) {
        errors.push(`RLS policy blocking profiles access: ${profileError.message}`);
        steps.push('✗ Profiles table RLS policy needs fixing');
      } else {
        steps.push('✓ Profiles table RLS policy working');
      }

      // Test wallets table access
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .limit(1);

      if (walletError) {
        errors.push(`RLS policy blocking wallets access: ${walletError.message}`);
        steps.push('✗ Wallets table RLS policy needs fixing');
      } else {
        steps.push('✓ Wallets table RLS policy working');
      }

      const success = errors.length === 0;
      return {
        success,
        message: success ? 'RLS policies are working correctly' : 'RLS policies need fixing',
        steps,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      errors.push(`RLS test error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to test RLS policies',
        steps,
        errors
      };
    }
  }

  generateRLSFixSQL(): string {
    return `-- Fix RLS Policies for Profiles and Wallets

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Wallets table policies
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;

CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'wallets')
ORDER BY tablename, policyname;
`;
  }

  async verifyRecovery(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !anonKey) {
        errors.push('Supabase credentials not configured');
        return {
          success: false,
          message: 'Cannot verify recovery',
          steps,
          errors
        };
      }

      steps.push('Verifying authentication recovery...');

      // Test 1: Client creation
      const supabase = createClient(supabaseUrl, anonKey);
      steps.push('✓ Supabase client created successfully');

      // Test 2: Session check
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        errors.push(`Session check failed: ${sessionError.message}`);
      } else {
        steps.push('✓ Session check working');
      }

      // Test 3: Direct endpoint access
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          }
        });

        if (response.status === 403) {
          errors.push('Still getting 403 on /auth/v1/user endpoint');
          steps.push('✗ Endpoint access still blocked');
        } else if (response.status === 401) {
          steps.push('✓ Endpoint accessible (401 expected without valid token)');
        } else if (response.ok) {
          steps.push('✓ Endpoint fully accessible');
        }
      } catch (fetchError: any) {
        errors.push(`Endpoint test failed: ${fetchError.message}`);
      }

      // Test 4: RLS policies (if logged in)
      if (sessionData?.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);

        if (profileError) {
          errors.push(`Profile access still blocked: ${profileError.message}`);
          steps.push('✗ RLS policies still need fixing');
        } else {
          steps.push('✓ Profile access working');
        }
      }

      const success = errors.length === 0;
      return {
        success,
        message: success ? 'Authentication fully recovered' : 'Some issues remain',
        steps,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      errors.push(`Recovery verification error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to verify recovery',
        steps,
        errors
      };
    }
  }

  generateRecoveryGuide(): string {
    return `# Authentication Recovery Guide

## Step 1: Verify Credentials

1. Check your .env file contains:
   \`\`\`
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   \`\`\`

2. Get correct values from Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
   - Copy "Project URL" → VITE_SUPABASE_URL
   - Copy "anon public" key → VITE_SUPABASE_PUBLISHABLE_KEY

3. Restart your development server after updating .env

## Step 2: Fix RLS Policies

If you're getting 403 errors even with correct credentials:

1. Go to Supabase Dashboard → SQL Editor
2. Run the RLS fix SQL (use generateRLSFixSQL() method)
3. Verify policies are created correctly

## Step 3: Clear Browser Cache

1. Open DevTools (F12)
2. Go to Application → Storage
3. Click "Clear site data"
4. Refresh the page

## Step 4: Test Authentication

1. Log out completely
2. Log in again
3. Check if you can access your profile data
4. Verify no 403 errors in console

## Common Issues

### Issue: 403 Forbidden on /auth/v1/user
**Cause**: Invalid or expired session token
**Fix**: Log out and log in again

### Issue: RLS policy blocking access
**Cause**: Policies not allowing authenticated users
**Fix**: Run RLS fix SQL from Step 2

### Issue: Wrong project URL
**Cause**: Using old or incorrect Supabase project URL
**Fix**: Verify URL matches your current project

### Issue: API key mismatch
**Cause**: Using keys from different project
**Fix**: Ensure URL and keys are from same project
`;
  }
}
