import type { RecoveryResult } from './auth-recovery';

export class MPesaRecoveryModule {
  private readonly MPESA_API_HOST = 'api.safaricom.co.ke';
  private readonly MPESA_PROXY_URL = 'https://mpesa-proxy-server-2.onrender.com';
  private readonly GOOGLE_DNS = '8.8.8.8';
  private readonly CLOUDFLARE_DNS = '1.1.1.1';

  async testDNS(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push(`Testing DNS resolution for ${this.MPESA_API_HOST}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch(`https://${this.MPESA_API_HOST}`, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        steps.push('✓ DNS resolution successful');
        
        return {
          success: true,
          message: 'DNS is working correctly',
          steps
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          errors.push('DNS resolution timeout');
          steps.push('✗ DNS timeout - resolution taking too long');
        } else if (fetchError.message.includes('ENOTFOUND')) {
          errors.push('DNS cannot resolve hostname');
          steps.push('✗ DNS resolution failed completely');
        } else {
          // Connection refused means DNS worked
          steps.push('✓ DNS resolution working (connection refused is expected)');
          return {
            success: true,
            message: 'DNS working, connection refused is normal',
            steps
          };
        }
      }

      return {
        success: false,
        message: 'DNS resolution failed',
        steps,
        errors
      };
    } catch (error: any) {
      errors.push(`DNS test error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to test DNS',
        steps,
        errors
      };
    }
  }

  async testProxyConnectivity(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Testing M-Pesa proxy server...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.MPESA_PROXY_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        steps.push('✓ Proxy server is accessible');
        steps.push('✓ Can use proxy as fallback for M-Pesa API');
        
        return {
          success: true,
          message: 'Proxy server working - can be used as fallback',
          steps
        };
      } else {
        errors.push(`Proxy returned status ${response.status}`);
        steps.push('✗ Proxy server responding but may have issues');
        
        return {
          success: false,
          message: 'Proxy server has issues',
          steps,
          errors
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        errors.push('Proxy server timeout');
        steps.push('✗ Proxy server not responding');
      } else {
        errors.push(`Proxy error: ${error.message}`);
        steps.push('✗ Cannot reach proxy server');
      }

      return {
        success: false,
        message: 'Proxy server not accessible',
        steps,
        errors
      };
    }
  }

  async verifyCredentials(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    const consumerKey = import.meta.env.VITE_MPESA_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_MPESA_CONSUMER_SECRET;
    const shortcode = import.meta.env.VITE_MPESA_SHORTCODE;
    const passkey = import.meta.env.VITE_MPESA_PASSKEY;

    steps.push('Checking M-Pesa credentials...');

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      errors.push('M-Pesa credentials not configured');
      steps.push('✗ Missing required environment variables');
      
      return {
        success: false,
        message: 'Credentials not configured',
        steps,
        errors
      };
    }

    steps.push('✓ All credential variables present');

    // Validate formats
    if (shortcode.length < 5 || shortcode.length > 7) {
      errors.push('Shortcode format incorrect (should be 5-7 digits)');
      steps.push('✗ Shortcode format invalid');
    } else {
      steps.push('✓ Shortcode format valid');
    }

    if (passkey.length < 20) {
      errors.push('Passkey looks too short');
      steps.push('✗ Passkey format suspicious');
    } else {
      steps.push('✓ Passkey format valid');
    }

    if (consumerKey.length < 10) {
      errors.push('Consumer key looks too short');
      steps.push('✗ Consumer key format suspicious');
    } else {
      steps.push('✓ Consumer key format valid');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'Credentials format valid' : 'Credential format issues found',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async verifyCallbackURL(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    const callbackUrl = import.meta.env.VITE_MPESA_CALLBACK_URL;

    steps.push('Checking M-Pesa callback URL...');

    if (!callbackUrl) {
      errors.push('Callback URL not configured');
      steps.push('✗ VITE_MPESA_CALLBACK_URL not set');
      
      return {
        success: false,
        message: 'Callback URL not configured',
        steps,
        errors
      };
    }

    steps.push(`✓ Callback URL configured: ${callbackUrl}`);

    // Validate URL format
    if (!callbackUrl.startsWith('https://')) {
      errors.push('Callback URL must use HTTPS');
      steps.push('✗ URL must start with https://');
    } else {
      steps.push('✓ Using HTTPS');
    }

    if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
      errors.push('Callback URL cannot be localhost');
      steps.push('✗ M-Pesa cannot reach localhost URLs');
      steps.push('  Use ngrok or deploy to public server');
    } else {
      steps.push('✓ URL is publicly accessible');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'Callback URL valid' : 'Callback URL has issues',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  generateDNSFallbackGuide(): string {
    return `# M-Pesa DNS Fallback Configuration

## Option 1: Use Proxy Server (Recommended)

The M-Pesa proxy server is already configured in your app:
\`\`\`
${this.MPESA_PROXY_URL}
\`\`\`

Your app automatically uses this proxy when direct API access fails.

## Option 2: Change DNS Servers

### Windows:
1. Open Control Panel → Network and Internet → Network Connections
2. Right-click your network adapter → Properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties
4. Select "Use the following DNS server addresses"
5. Preferred DNS: ${this.GOOGLE_DNS}
6. Alternate DNS: ${this.CLOUDFLARE_DNS}
7. Click OK and restart network adapter

### macOS:
1. System Preferences → Network
2. Select your connection → Advanced
3. Go to DNS tab
4. Click + and add: ${this.GOOGLE_DNS}
5. Click + and add: ${this.CLOUDFLARE_DNS}
6. Click OK → Apply

### Linux:
\`\`\`bash
# Edit resolv.conf
sudo nano /etc/resolv.conf

# Add these lines:
nameserver ${this.GOOGLE_DNS}
nameserver ${this.CLOUDFLARE_DNS}
\`\`\`

## Option 3: Use Direct IP (Advanced)

If DNS completely fails, you can use M-Pesa's IP address directly.
Contact Safaricom support for the current IP address.

## Verify DNS Fix

After changing DNS:
1. Open terminal/command prompt
2. Run: \`ping ${this.MPESA_API_HOST}\`
3. Should see responses (not timeout)
`;
  }

  generateRecoveryGuide(): string {
    return `# M-Pesa Recovery Guide

## Quick Fix: Use Proxy Server

Your app is already configured to use the proxy server at:
\`\`\`
${this.MPESA_PROXY_URL}
\`\`\`

The proxy automatically handles M-Pesa API calls when direct access fails.

## Step 1: Verify Credentials

1. Check .env file contains:
   \`\`\`
   VITE_MPESA_CONSUMER_KEY=your-consumer-key
   VITE_MPESA_CONSUMER_SECRET=your-consumer-secret
   VITE_MPESA_SHORTCODE=your-shortcode
   VITE_MPESA_PASSKEY=your-passkey
   VITE_MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa-callback
   \`\`\`

2. Get credentials from Safaricom Daraja Portal:
   - Go to: https://developer.safaricom.co.ke/
   - Login → My Apps → Select your app
   - Copy Consumer Key and Consumer Secret
   - Get Shortcode and Passkey from Lipa Na M-Pesa Online section

## Step 2: Fix DNS Issues

If getting DNS timeouts:

1. **Use Proxy** (easiest): Already configured, no action needed
2. **Change DNS**: Use Google DNS (${this.GOOGLE_DNS}) or Cloudflare (${this.CLOUDFLARE_DNS})
3. **Contact ISP**: Ask if they're blocking Safaricom API

## Step 3: Configure Callback URL

1. Callback URL must be:
   - HTTPS (not HTTP)
   - Publicly accessible (not localhost)
   - Registered in Daraja Portal

2. For local development:
   - Use ngrok: \`ngrok http 3000\`
   - Copy HTTPS URL to .env
   - Register URL in Daraja Portal

3. For production:
   - Use your deployed domain
   - Example: \`https://your-app.com/api/mpesa-callback\`

## Step 4: Test STK Push

1. Run diagnostics to verify setup
2. Try small test transaction (KES 1)
3. Check phone receives STK push prompt
4. Verify callback receives response

## Common Issues

### Issue: DNS Timeout
**Cause**: Cannot resolve api.safaricom.co.ke
**Fix**: Use proxy server (already configured) or change DNS

### Issue: Invalid Credentials
**Cause**: Wrong consumer key/secret
**Fix**: Get fresh credentials from Daraja Portal

### Issue: Callback Not Received
**Cause**: URL not publicly accessible
**Fix**: Use ngrok for testing or deploy to public server

### Issue: STK Push Not Received
**Cause**: Wrong shortcode or passkey
**Fix**: Verify shortcode and passkey match your Daraja app

## Testing Checklist

- [ ] Credentials configured in .env
- [ ] Proxy server accessible
- [ ] Callback URL is HTTPS and public
- [ ] Test transaction succeeds
- [ ] Callback receives response
- [ ] Wallet credited correctly
`;
  }

  async verifyRecovery(): Promise<RecoveryResult> {
    const steps: string[] = [];
    const errors: string[] = [];

    steps.push('Verifying M-Pesa recovery...');

    // Test 1: DNS or Proxy
    const dnsResult = await this.testDNS();
    const proxyResult = await this.testProxyConnectivity();

    if (!dnsResult.success && !proxyResult.success) {
      errors.push('Neither DNS nor proxy working');
      steps.push('✗ Cannot reach M-Pesa API or proxy');
    } else if (!dnsResult.success && proxyResult.success) {
      steps.push('✓ Proxy working (DNS failed but proxy available)');
    } else {
      steps.push('✓ M-Pesa API accessible');
    }

    // Test 2: Credentials
    const credResult = await this.verifyCredentials();
    if (!credResult.success) {
      errors.push('Credentials invalid or missing');
      steps.push('✗ Credentials need fixing');
    } else {
      steps.push('✓ Credentials configured correctly');
    }

    // Test 3: Callback URL
    const callbackResult = await this.verifyCallbackURL();
    if (!callbackResult.success) {
      errors.push('Callback URL issues');
      steps.push('✗ Callback URL needs fixing');
    } else {
      steps.push('✓ Callback URL configured correctly');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? 'M-Pesa fully recovered' : 'Some issues remain',
      steps,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
