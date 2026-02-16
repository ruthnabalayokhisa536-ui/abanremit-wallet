import { createClient } from '@supabase/supabase-js';
import type { AuthDiagnostic } from './types';

export class AuthDiagnosticModule {
  async diagnose(): Promise<AuthDiagnostic> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    const checks = {
      urlConfigured: false,
      anonKeyValid: false,
      serviceKeyValid: false,
      userEndpointAccessible: false,
      rlsPoliciesCorrect: false
    };

    // Check 1: Verify environment variables are configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !anonKey) {
      errors.push('Missing Supabase environment variables');
      recommendations.push('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env file');
      
      return {
        status: 'fail',
        checks,
        errors,
        recommendations
      };
    }

    checks.urlConfigured = true;

    // Check 2: Test anon key validity by creating client
    try {
      const supabase = createClient(supabaseUrl, anonKey);
      
      // Check 3: Test client-side authentication
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        errors.push(`Session check failed: ${sessionError.message}`);
        recommendations.push('Check if Supabase project is active and keys are correct');
      } else {
        checks.anonKeyValid = true;
      }

      // Check 4: Test direct HTTP GET to /auth/v1/user endpoint
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          }
        });

        if (response.status === 403) {
          errors.push('403 Forbidden error on /auth/v1/user endpoint');
          recommendations.push('This indicates an authentication token issue. Try:');
          recommendations.push('1. Check if user is logged in with valid session');
          recommendations.push('2. Verify RLS policies allow authenticated users to access their data');
          recommendations.push('3. Check if API keys match the Supabase project');
          recommendations.push('4. Verify project URL is correct');
        } else if (response.status === 401) {
          errors.push('401 Unauthorized - Invalid or missing authentication token');
          recommendations.push('User needs to log in to get a valid session token');
        } else if (response.ok) {
          checks.userEndpointAccessible = true;
        } else {
          errors.push(`Unexpected status ${response.status} from /auth/v1/user`);
          const body = await response.text();
          errors.push(`Response: ${body}`);
        }
      } catch (fetchError: any) {
        errors.push(`Network error accessing auth endpoint: ${fetchError.message}`);
        recommendations.push('Check network connectivity to Supabase');
      }

      // Check 5: Test RLS policies (requires authenticated user)
      if (sessionData?.session) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

          if (profileError) {
            errors.push(`RLS policy check failed: ${profileError.message}`);
            recommendations.push('Check RLS policies on profiles table');
            recommendations.push('Ensure authenticated users can read their own profiles');
          } else {
            checks.rlsPoliciesCorrect = true;
          }
        } catch (rlsError: any) {
          errors.push(`RLS test error: ${rlsError.message}`);
        }
      } else {
        errors.push('No active session - cannot test RLS policies');
        recommendations.push('Log in to test RLS policies');
      }

    } catch (error: any) {
      errors.push(`Supabase client error: ${error.message}`);
      recommendations.push('Verify Supabase URL and anon key are correct');
      checks.anonKeyValid = false;
    }

    const status = Object.values(checks).every(v => v) ? 'pass' : 'fail';

    return {
      status,
      checks,
      errors,
      recommendations
    };
  }

  async testWithCredentials(url: string, anonKey: string): Promise<AuthDiagnostic> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    const checks = {
      urlConfigured: true,
      anonKeyValid: false,
      serviceKeyValid: false,
      userEndpointAccessible: false,
      rlsPoliciesCorrect: false
    };

    try {
      const supabase = createClient(url, anonKey);
      
      const { error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        errors.push(`Credentials test failed: ${sessionError.message}`);
        recommendations.push('Provided credentials are invalid');
      } else {
        checks.anonKeyValid = true;
        recommendations.push('Credentials are valid - update .env file with these values');
      }
    } catch (error: any) {
      errors.push(`Test error: ${error.message}`);
    }

    const status = checks.anonKeyValid ? 'pass' : 'fail';

    return {
      status,
      checks,
      errors,
      recommendations
    };
  }
}
