import type { RecoveryResult } from './auth-recovery';

export class PaystackRecoveryModule {
  private readonly PAYSTACK_API_URL = 'https://api.paystack.co';
  private readonly PAYSTACK_DASHBOARD_URL = 'https://dashboard.paystack.com/#/settings/developer';

  async testConnectivity(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Testing Paystack API connectivity...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.PAYSTACK_API_URL, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      steps.push('✓ Paystack API is accessible');

      return {
        success: true,
        message: 'Paystack API accessible',
        steps
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        errors.push('Paystack API timeout');
        steps.push('✗ Connection timeout');
      } else {
        errors.push(`Connection error: ${error.message}`);
        steps.push('✗ Cannot reach Paystack API');
      }

      return {
        success: false,
        message: 'Paystack API not accessible',
        steps,
        errors
      };
    }
  }

  async verifyCredentials(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

    steps.push('Checking Paystack credentials...');

    // Check public key
    if (!publicKey) {
      errors.push('Public key not configured');
      steps.push('✗ VITE_PAYSTACK_PUBLIC_KEY not set');
    } else if (!publicKey.startsWith('pk_test_') && !publicKey.startsWith('pk_live_')) {
      errors.push('Public key format incorrect');
      steps.push('✗ Public key should start with pk_test_ or pk_live_');
    } else {
      const keyType = publicKey.startsWith('pk_test_') ? 'TEST' : 'LIVE';
      steps.push(`✓ Public key configured (${keyType} mode)`);
    }

    // Check secret key
    if (!secretKey) {
      errors.push('Secret key not configured');
      steps.push('✗ VITE_PAYSTACK_SECRET_KEY not set');
    } else if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      errors.push('Secret key format incorrect');
      steps.push('✗ Secret key should start with sk_test_ or sk_live_');
    } else {
      const keyType = secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
      steps.push(`✓ Secret key configured (${keyType} mode)`);
      
      if (keyType === 'TEST') {
        steps.push('⚠️  Using TEST keys - switch to LIVE for production');
      }
    }

    // Check key consistency
    if (publicKey && secretKey) {
      const publicIsTest = publicKey.startsWith('pk_test_');
      const secretIsTest = secretKey.startsWith('sk_test_');
      
      if (publicIsTest !== secretIsTest) {
        errors.push('Key mismatch: public and secret keys are from different modes');
        steps.push('✗ Public and secret keys must both be TEST or both be LIVE');
      } else {
        steps.push('✓ Keys are consistent (both same mode)');
      }
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'Credentials valid' : 'Credential issues found',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async testAPIAuthentication(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      errors.push('Secret key not configured');
      return {
        success: false,
        message: 'Cannot test authentication without secret key',
        steps,
        errors
      };
    }

    try {
      steps.push('Testing API authentication...');

      // Test with invalid reference (should get 404, not 401)
      const response = await fetch(`${this.PAYSTACK_API_URL}/transaction/verify/invalid-ref-test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        errors.push('Secret key is invalid or expired');
        steps.push('✗ Authentication failed - key is invalid');
        
        return {
          success: false,
          message: 'Secret key invalid',
          steps,
          errors
        };
      } else if (response.status === 404) {
        steps.push('✓ Authentication successful (404 expected for invalid reference)');
        
        return {
          success: true,
          message: 'API authentication working',
          steps
        };
      } else {
        steps.push(`✓ API responding (status ${response.status})`);
        
        return {
          success: true,
          message: 'API accessible',
          steps
        };
      }
    } catch (error: any) {
      errors.push(`Authentication test error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to test authentication',
        steps,
        errors
      };
    }
  }

  async verifyWebhookURL(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    const webhookUrl = import.meta.env.VITE_PAYSTACK_WEBHOOK_URL ||
                       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-webhook`;

    steps.push('Checking Paystack webhook URL...');

    if (!webhookUrl) {
      errors.push('Webhook URL not configured');
      steps.push('✗ Webhook URL not set');
      
      return {
        success: false,
        message: 'Webhook URL not configured',
        steps,
        errors
      };
    }

    steps.push(`✓ Webhook URL: ${webhookUrl}`);

    // Validate URL format
    if (!webhookUrl.startsWith('https://')) {
      errors.push('Webhook URL must use HTTPS');
      steps.push('✗ URL must start with https://');
    } else {
      steps.push('✓ Using HTTPS');
    }

    if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      errors.push('Webhook URL cannot be localhost');
      steps.push('✗ Paystack cannot reach localhost URLs');
      steps.push('  Use ngrok or deploy to public server');
    } else {
      steps.push('✓ URL is publicly accessible');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'Webhook URL valid' : 'Webhook URL has issues',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  generateRLSFixSQL(): string {
    return `-- Fix RLS Policies for Paystack Transactions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own paystack transactions" ON paystack_transactions;
DROP POLICY IF EXISTS "Service role can insert paystack transactions" ON paystack_transactions;
DROP POLICY IF EXISTS "Service role can update paystack transactions" ON paystack_transactions;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own paystack transactions"
  ON paystack_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert transactions (for webhook)
CREATE POLICY "Service role can insert paystack transactions"
  ON paystack_transactions FOR INSERT
  WITH CHECK (true);

-- Allow service role to update transactions (for webhook)
CREATE POLICY "Service role can update paystack transactions"
  ON paystack_transactions FOR UPDATE
  USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'paystack_transactions'
ORDER BY policyname;
`;
  }

  generateRecoveryGuide(): string {
    return `# Paystack Recovery Guide

## Step 1: Get Fresh API Keys

1. Go to Paystack Dashboard:
   ${this.PAYSTACK_DASHBOARD_URL}

2. Generate new API keys:
   - Click "Generate New Keys" if needed
   - Copy Public Key (starts with pk_)
   - Copy Secret Key (starts with sk_)

3. Update .env file:
   \`\`\`
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # or pk_live_xxxxx
   VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx
   \`\`\`

4. Restart development server

## Step 2: Configure Webhook

1. In Paystack Dashboard, go to Settings → Webhooks

2. Add webhook URL:
   - Development: Use ngrok HTTPS URL
   - Production: Use your deployed domain
   - Example: \`https://your-app.com/functions/v1/paystack-webhook\`

3. Save webhook URL

4. Copy webhook secret (if provided)

## Step 3: Fix RLS Policies

If webhooks aren't updating transactions:

1. Go to Supabase Dashboard → SQL Editor
2. Run the RLS fix SQL (use generateRLSFixSQL() method)
3. Verify service role can write to paystack_transactions table

## Step 4: Test Payment Flow

1. Initialize test payment (KES 100)
2. Complete payment on Paystack page
3. Verify webhook receives callback
4. Check transaction status updated
5. Verify wallet credited

## Common Issues

### Issue: 401 Unauthorized
**Cause**: Invalid or expired API keys
**Fix**: Generate new keys from dashboard

### Issue: Key Mismatch
**Cause**: Using test public key with live secret key (or vice versa)
**Fix**: Ensure both keys are from same mode (test or live)

### Issue: Webhook Not Received
**Cause**: URL not publicly accessible or not registered
**Fix**: 
- Use ngrok for local testing
- Register URL in Paystack dashboard
- Ensure URL is HTTPS

### Issue: Transaction Not Updated
**Cause**: RLS policies blocking service role
**Fix**: Run RLS fix SQL to allow service role access

### Issue: Payment Succeeds but Wallet Not Credited
**Cause**: Webhook processing error
**Fix**: 
- Check webhook logs in Supabase
- Verify RLS policies allow updates
- Check edge function logs

## Testing Checklist

- [ ] API keys configured in .env
- [ ] Keys are from same mode (both test or both live)
- [ ] Webhook URL registered in dashboard
- [ ] Webhook URL is HTTPS and public
- [ ] RLS policies allow service role access
- [ ] Test payment completes successfully
- [ ] Webhook receives callback
- [ ] Transaction status updates
- [ ] Wallet credited correctly

## Switching from Test to Live

When ready for production:

1. Get LIVE keys from dashboard
2. Update .env with pk_live_ and sk_live_ keys
3. Update webhook URL to production domain
4. Test with small real transaction
5. Monitor first few transactions closely
`;
  }

  async verifyRecovery(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    steps.push('Verifying Paystack recovery...');

    // Test 1: Connectivity
    const connResult = await this.testConnectivity();
    if (!connResult.success) {
      errors.push('API not accessible');
      steps.push('✗ Cannot reach Paystack API');
    } else {
      steps.push('✓ API accessible');
    }

    // Test 2: Credentials
    const credResult = await this.verifyCredentials();
    if (!credResult.success) {
      errors.push('Credentials invalid');
      steps.push('✗ Credentials need fixing');
    } else {
      steps.push('✓ Credentials configured correctly');
    }

    // Test 3: API Authentication
    if (credResult.success) {
      const authResult = await this.testAPIAuthentication();
      if (!authResult.success) {
        errors.push('API authentication failed');
        steps.push('✗ Keys are invalid');
      } else {
        steps.push('✓ API authentication working');
      }
    }

    // Test 4: Webhook URL
    const webhookResult = await this.verifyWebhookURL();
    if (!webhookResult.success) {
      errors.push('Webhook URL issues');
      steps.push('✗ Webhook URL needs fixing');
    } else {
      steps.push('✓ Webhook URL configured correctly');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'Paystack fully recovered' : 'Some issues remain',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
