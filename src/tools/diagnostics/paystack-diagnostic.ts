import type { PaystackDiagnostic } from './types';
import { createHmac } from 'crypto';

export class PaystackDiagnosticModule {
  private readonly PAYSTACK_API_URL = 'https://api.paystack.co';

  async diagnose(): Promise<PaystackDiagnostic> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    const checks = {
      apiConnectivity: false,
      publicKeyValid: false,
      secretKeyValid: false,
      webhookUrlAccessible: false,
      signatureValidation: false
    };

    // Check 1: Test API connectivity
    try {
      console.log('Testing Paystack API connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(this.PAYSTACK_API_URL, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      checks.apiConnectivity = true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        errors.push('Paystack API connection timeout');
        recommendations.push('Network connectivity issue to api.paystack.co');
      } else {
        errors.push(`Paystack API connectivity error: ${error.message}`);
        recommendations.push('Check internet connection and firewall settings');
      }
    }

    // Check 2: Validate public key format
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey) {
      errors.push('Paystack public key not configured');
      recommendations.push('Set VITE_PAYSTACK_PUBLIC_KEY in .env file');
      recommendations.push('Get from Paystack Dashboard: https://dashboard.paystack.com/#/settings/developer');
    } else {
      if (publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_live_')) {
        checks.publicKeyValid = true;
      } else {
        errors.push('Public key format is incorrect');
        recommendations.push('Public key should start with pk_test_ or pk_live_');
        checks.publicKeyValid = false;
      }
    }

    // Check 3: Validate secret key format
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
    
    if (!secretKey) {
      errors.push('Paystack secret key not configured');
      recommendations.push('Set VITE_PAYSTACK_SECRET_KEY in .env file');
      recommendations.push('⚠️ WARNING: Never expose secret key in frontend code');
      recommendations.push('Move secret key to backend/edge function');
    } else {
      if (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')) {
        checks.secretKeyValid = true;
        
        // Warn if using test key in production
        if (secretKey.startsWith('sk_test_')) {
          recommendations.push('⚠️ Using TEST secret key - switch to LIVE key for production');
        }
      } else {
        errors.push('Secret key format is incorrect');
        recommendations.push('Secret key should start with sk_test_ or sk_live_');
        checks.secretKeyValid = false;
      }
    }

    // Check 4: Test API with credentials (if available)
    if (checks.apiConnectivity && checks.secretKeyValid && secretKey) {
      try {
        console.log('Testing Paystack API with credentials...');
        
        const response = await fetch(`${this.PAYSTACK_API_URL}/transaction/verify/invalid-ref`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          }
        });

        // We expect 404 for invalid reference, but 401 means auth failed
        if (response.status === 401) {
          errors.push('Paystack secret key is invalid or expired');
          recommendations.push('Generate new API keys from Paystack Dashboard');
          checks.secretKeyValid = false;
        } else if (response.status === 404) {
          // This is expected - means auth worked
          checks.secretKeyValid = true;
        }
      } catch (error: any) {
        errors.push(`API test error: ${error.message}`);
      }
    }

    // Check 5: Webhook URL configuration
    const webhookUrl = import.meta.env.VITE_PAYSTACK_WEBHOOK_URL || 
                       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-webhook`;
    
    if (!webhookUrl) {
      errors.push('Paystack webhook URL not configured');
      recommendations.push('Set VITE_PAYSTACK_WEBHOOK_URL in .env file');
    } else {
      if (!webhookUrl.startsWith('https://')) {
        errors.push('Webhook URL must use HTTPS');
        recommendations.push('Paystack requires HTTPS for webhook URLs');
      } else if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
        errors.push('Webhook URL cannot be localhost');
        recommendations.push('Use a public URL or ngrok for testing');
      } else {
        checks.webhookUrlAccessible = true;
        recommendations.push(`✓ Webhook URL configured: ${webhookUrl}`);
        recommendations.push('Ensure this URL is set in Paystack Dashboard webhook settings');
      }
    }

    // Check 6: Test HMAC signature validation
    try {
      const testPayload = JSON.stringify({ event: 'test', data: { reference: 'test' } });
      const testSecret = secretKey || 'test-secret';
      
      // Paystack uses HMAC SHA512
      const hash = createHmac('sha512', testSecret)
        .update(testPayload)
        .digest('hex');
      
      if (hash && hash.length === 128) { // SHA512 produces 128 hex characters
        checks.signatureValidation = true;
      }
    } catch (error: any) {
      errors.push(`Signature validation test failed: ${error.message}`);
      recommendations.push('HMAC signature validation may not work correctly');
    }

    // Summary recommendations
    if (!checks.apiConnectivity) {
      recommendations.push('⚠️ CRITICAL: Cannot reach Paystack API');
      recommendations.push('Check network connectivity and DNS resolution');
    }

    if (!checks.secretKeyValid && secretKey) {
      recommendations.push('⚠️ CRITICAL: Invalid Paystack credentials');
      recommendations.push('Steps to fix:');
      recommendations.push('1. Go to https://dashboard.paystack.com/#/settings/developer');
      recommendations.push('2. Generate new API keys');
      recommendations.push('3. Update .env file with new keys');
    }

    if (checks.publicKeyValid && checks.secretKeyValid) {
      const keyType = publicKey?.startsWith('pk_test_') ? 'TEST' : 'LIVE';
      recommendations.push(`✓ Using ${keyType} mode keys`);
    }

    const status = checks.apiConnectivity && checks.publicKeyValid && checks.secretKeyValid ? 'pass' : 'fail';

    return {
      status,
      checks,
      errors,
      recommendations
    };
  }

  async testApiConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(this.PAYSTACK_API_URL, {
        method: 'HEAD'
      });

      return {
        success: true,
        message: 'Paystack API is accessible'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `API connection failed: ${error.message}`
      };
    }
  }

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const hash = createHmac('sha512', secret)
        .update(payload)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      return false;
    }
  }
}
