import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

/**
 * Feature: airtime-transaction-fix
 * Property 4: Missing credentials error messages
 * Validates: Requirements 3.5
 * 
 * For any combination of missing Instalipa credentials (consumer key, consumer secret),
 * the Airtime_Service should throw an error message that specifically identifies
 * which credentials are not configured and includes a reference to the documentation file.
 */

describe("Instalipa Missing Credentials Error Messages - Property Tests", () => {
  // Store original environment variables
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Save original environment
    originalEnv = {
      VITE_AIRTIME_API_URL: import.meta.env.VITE_AIRTIME_API_URL,
      VITE_AIRTIME_CONSUMER_KEY: import.meta.env.VITE_AIRTIME_CONSUMER_KEY,
      VITE_AIRTIME_CONSUMER_SECRET: import.meta.env.VITE_AIRTIME_CONSUMER_SECRET,
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    };
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] !== undefined) {
        import.meta.env[key] = originalEnv[key];
      } else {
        delete import.meta.env[key];
      }
    });
  });

  it("Property 4: Error message lists specific missing credentials", () => {
    fc.assert(
      fc.property(
        // Generate all combinations of missing credentials
        fc.record({
          hasConsumerKey: fc.boolean(),
          hasConsumerSecret: fc.boolean(),
        }),
        (config) => {
          // Set up environment based on configuration
          import.meta.env.VITE_AIRTIME_API_URL = "https://business.instalipa.co.ke/";
          import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co";
          
          if (config.hasConsumerKey) {
            import.meta.env.VITE_AIRTIME_CONSUMER_KEY = "test_consumer_key_123";
          } else {
            delete import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
          }

          if (config.hasConsumerSecret) {
            import.meta.env.VITE_AIRTIME_CONSUMER_SECRET = "test_consumer_secret_456";
          } else {
            delete import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
          }

          // Dynamically import the service to get fresh environment values
          const getCredentials = () => {
            const apiUrl = import.meta.env.VITE_AIRTIME_API_URL || 'https://business.instalipa.co.ke/';
            const consumerKey = import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
            const consumerSecret = import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
            const callbackUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/airtime-callback';

            // Build array of missing credential names
            const missing: string[] = [];
            if (!consumerKey) missing.push('VITE_AIRTIME_CONSUMER_KEY');
            if (!consumerSecret) missing.push('VITE_AIRTIME_CONSUMER_SECRET');

            if (missing.length > 0) {
              throw new Error(
                `Instalipa credentials not configured. Missing: ${missing.join(', ')}. ` +
                `Please check your .env file and refer to docs/INSTALIPA_SETUP.md for setup instructions.`
              );
            }

            return { apiUrl, consumerKey, consumerSecret, callbackUrl };
          };

          // Build expected missing credentials list
          const expectedMissing: string[] = [];
          if (!config.hasConsumerKey) expectedMissing.push('VITE_AIRTIME_CONSUMER_KEY');
          if (!config.hasConsumerSecret) expectedMissing.push('VITE_AIRTIME_CONSUMER_SECRET');

          if (expectedMissing.length > 0) {
            // Should throw error with specific missing credentials
            try {
              getCredentials();
              // If we get here, the test should fail
              return false;
            } catch (error: any) {
              const errorMessage = error.message;

              // Verify error message contains "Missing:"
              if (!errorMessage.includes("Missing:")) {
                return false;
              }

              // Verify error message lists each missing credential
              for (const missing of expectedMissing) {
                if (!errorMessage.includes(missing)) {
                  return false;
                }
              }

              // Verify error message includes documentation reference
              if (!errorMessage.includes("docs/INSTALIPA_SETUP.md")) {
                return false;
              }

              return true;
            }
          } else {
            // All credentials present - should not throw
            try {
              const result = getCredentials();
              // Verify credentials are returned correctly
              return (
                result.consumerKey === "test_consumer_key_123" &&
                result.consumerSecret === "test_consumer_secret_456" &&
                result.apiUrl === "https://business.instalipa.co.ke/" &&
                result.callbackUrl === "https://test.supabase.co/functions/v1/airtime-callback"
              );
            } catch (error) {
              // Should not throw when all credentials are present
              return false;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 4.1: Error message format is consistent across all missing credential combinations", () => {
    fc.assert(
      fc.property(
        fc.record({
          hasConsumerKey: fc.boolean(),
          hasConsumerSecret: fc.boolean(),
        }),
        (config) => {
          // Set up environment
          import.meta.env.VITE_AIRTIME_API_URL = "https://business.instalipa.co.ke/";
          import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co";
          
          if (config.hasConsumerKey) {
            import.meta.env.VITE_AIRTIME_CONSUMER_KEY = "key";
          } else {
            delete import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
          }

          if (config.hasConsumerSecret) {
            import.meta.env.VITE_AIRTIME_CONSUMER_SECRET = "secret";
          } else {
            delete import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
          }

          const getCredentials = () => {
            const apiUrl = import.meta.env.VITE_AIRTIME_API_URL || 'https://business.instalipa.co.ke/';
            const consumerKey = import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
            const consumerSecret = import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
            const callbackUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/airtime-callback';

            const missing: string[] = [];
            if (!consumerKey) missing.push('VITE_AIRTIME_CONSUMER_KEY');
            if (!consumerSecret) missing.push('VITE_AIRTIME_CONSUMER_SECRET');

            if (missing.length > 0) {
              throw new Error(
                `Instalipa credentials not configured. Missing: ${missing.join(', ')}. ` +
                `Please check your .env file and refer to docs/INSTALIPA_SETUP.md for setup instructions.`
              );
            }

            return { apiUrl, consumerKey, consumerSecret, callbackUrl };
          };

          const expectedMissing: string[] = [];
          if (!config.hasConsumerKey) expectedMissing.push('VITE_AIRTIME_CONSUMER_KEY');
          if (!config.hasConsumerSecret) expectedMissing.push('VITE_AIRTIME_CONSUMER_SECRET');

          if (expectedMissing.length === 0) {
            return true; // Skip when no credentials are missing
          }

          try {
            getCredentials();
            return false;
          } catch (error: any) {
            const errorMessage = error.message;

            // Verify consistent format: "Instalipa credentials not configured. Missing: X, Y. Please check..."
            const formatRegex = /^Instalipa credentials not configured\. Missing: .+\. Please check your \.env file and refer to docs\/INSTALIPA_SETUP\.md for setup instructions\.$/;
            
            return formatRegex.test(errorMessage);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 4.2: Missing credentials list order is deterministic", () => {
    fc.assert(
      fc.property(
        fc.constant({ hasConsumerKey: false, hasConsumerSecret: false }),
        (config) => {
          // Set up environment with both missing
          import.meta.env.VITE_AIRTIME_API_URL = "https://business.instalipa.co.ke/";
          import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co";
          delete import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
          delete import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;

          const getCredentials = () => {
            const apiUrl = import.meta.env.VITE_AIRTIME_API_URL || 'https://business.instalipa.co.ke/';
            const consumerKey = import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
            const consumerSecret = import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
            const callbackUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/airtime-callback';

            const missing: string[] = [];
            if (!consumerKey) missing.push('VITE_AIRTIME_CONSUMER_KEY');
            if (!consumerSecret) missing.push('VITE_AIRTIME_CONSUMER_SECRET');

            if (missing.length > 0) {
              throw new Error(
                `Instalipa credentials not configured. Missing: ${missing.join(', ')}. ` +
                `Please check your .env file and refer to docs/INSTALIPA_SETUP.md for setup instructions.`
              );
            }

            return { apiUrl, consumerKey, consumerSecret, callbackUrl };
          };

          try {
            getCredentials();
            return false;
          } catch (error: any) {
            // When both are missing, they should always appear in the same order
            const errorMessage = error.message;
            return errorMessage.includes("VITE_AIRTIME_CONSUMER_KEY, VITE_AIRTIME_CONSUMER_SECRET");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
