import type { MPesaDiagnostic } from './types';

export class MPesaDiagnosticModule {
  private readonly MPESA_API_HOST = 'api.safaricom.co.ke';
  private readonly MPESA_PROXY_URL = 'https://mpesa-proxy-server-2.onrender.com';

  async diagnose(): Promise<MPesaDiagnostic> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    const checks = {
      dnsResolution: false,
      apiConnectivity: false,
      credentialsValid: false,
      oauthTokenObtained: false,
      callbackUrlAccessible: false
    };

    // Check 1: DNS Resolution for M-Pesa API
    try {
      console.log(`Testing DNS resolution for ${this.MPESA_API_HOST}...`);
      
      // Try to resolve DNS by making a simple fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        await fetch(`https://${this.MPESA_API_HOST}`, {
          method: 'HEAD',
          signal: controller.signal
        });
        checks.dnsResolution = true;
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          errors.push(`DNS timeout for ${this.MPESA_API_HOST}`);
          recommendations.push('DNS resolution is timing out. This could be:');
          recommendations.push('1. Network connectivity issue');
          recommendations.push('2. DNS server problem');
          recommendations.push('3. Firewall blocking DNS queries');
          recommendations.push('4. Use M-Pesa proxy server as fallback');
        } else if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('getaddrinfo')) {
          errors.push(`Cannot resolve DNS for ${this.MPESA_API_HOST}`);
          recommendations.push('DNS resolution failed completely');
          recommendations.push('Try using alternative DNS servers (8.8.8.8, 1.1.1.1)');
        } else {
          // Connection refused or other errors mean DNS worked
          checks.dnsResolution = true;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      errors.push(`DNS check error: ${error.message}`);
    }

    // Check 2: Test M-Pesa Proxy connectivity (fallback)
    try {
      console.log('Testing M-Pesa proxy server connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.MPESA_PROXY_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        checks.apiConnectivity = true;
        recommendations.push('✓ M-Pesa proxy server is accessible and can be used as fallback');
      } else {
        errors.push(`M-Pesa proxy returned status ${response.status}`);
        recommendations.push('Proxy server is reachable but may have issues');
      }
    } catch (proxyError: any) {
      if (proxyError.name === 'AbortError') {
        errors.push('M-Pesa proxy server timeout');
        recommendations.push('Proxy server is not responding - check if it\'s running');
      } else {
        errors.push(`Proxy connectivity error: ${proxyError.message}`);
        recommendations.push('Cannot reach M-Pesa proxy server');
      }
    }

    // Check 3: Validate M-Pesa credentials format (if available)
    const mpesaConsumerKey = import.meta.env.VITE_MPESA_CONSUMER_KEY;
    const mpesaConsumerSecret = import.meta.env.VITE_MPESA_CONSUMER_SECRET;
    const mpesaShortcode = import.meta.env.VITE_MPESA_SHORTCODE;
    const mpesaPasskey = import.meta.env.VITE_MPESA_PASSKEY;

    if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaShortcode || !mpesaPasskey) {
      errors.push('M-Pesa credentials not configured in environment variables');
      recommendations.push('Set the following in .env file:');
      recommendations.push('- VITE_MPESA_CONSUMER_KEY');
      recommendations.push('- VITE_MPESA_CONSUMER_SECRET');
      recommendations.push('- VITE_MPESA_SHORTCODE');
      recommendations.push('- VITE_MPESA_PASSKEY');
      recommendations.push('Get these from Safaricom Daraja Portal: https://developer.safaricom.co.ke');
    } else {
      checks.credentialsValid = true;
      
      // Validate format
      if (mpesaShortcode.length < 5 || mpesaShortcode.length > 7) {
        errors.push('M-Pesa shortcode format looks incorrect (should be 5-7 digits)');
        checks.credentialsValid = false;
      }
      
      if (mpesaPasskey.length < 20) {
        errors.push('M-Pesa passkey looks too short');
        checks.credentialsValid = false;
      }
    }

    // Check 4: Test OAuth token acquisition (would need actual API call)
    // This is a placeholder - actual implementation would call M-Pesa OAuth endpoint
    if (checks.credentialsValid && (checks.dnsResolution || checks.apiConnectivity)) {
      recommendations.push('OAuth token test requires actual API credentials');
      recommendations.push('Test manually: POST to https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials');
    }

    // Check 5: Callback URL accessibility
    const callbackUrl = import.meta.env.VITE_MPESA_CALLBACK_URL;
    
    if (!callbackUrl) {
      errors.push('M-Pesa callback URL not configured');
      recommendations.push('Set VITE_MPESA_CALLBACK_URL in .env file');
      recommendations.push('URL must be publicly accessible (HTTPS required)');
      recommendations.push('Example: https://your-domain.com/api/mpesa-callback');
    } else {
      if (!callbackUrl.startsWith('https://')) {
        errors.push('Callback URL must use HTTPS');
        recommendations.push('M-Pesa requires HTTPS for callback URLs');
      }
      
      if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
        errors.push('Callback URL cannot be localhost');
        recommendations.push('Use a public URL or ngrok for testing');
      }
      
      if (callbackUrl.startsWith('https://') && !callbackUrl.includes('localhost')) {
        checks.callbackUrlAccessible = true;
      }
    }

    // Summary recommendations
    if (!checks.dnsResolution && !checks.apiConnectivity) {
      recommendations.push('⚠️ CRITICAL: Cannot reach M-Pesa API or proxy');
      recommendations.push('Immediate actions:');
      recommendations.push('1. Check internet connectivity');
      recommendations.push('2. Try using proxy server: ' + this.MPESA_PROXY_URL);
      recommendations.push('3. Contact network administrator about DNS issues');
    } else if (!checks.dnsResolution && checks.apiConnectivity) {
      recommendations.push('✓ Use proxy server as workaround for DNS issues');
      recommendations.push('Proxy URL: ' + this.MPESA_PROXY_URL);
    }

    const status = (checks.dnsResolution || checks.apiConnectivity) && checks.credentialsValid ? 'pass' : 'fail';

    return {
      status,
      checks,
      errors,
      recommendations
    };
  }

  async testProxyConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.MPESA_PROXY_URL}/health`, {
        method: 'GET'
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Proxy server is accessible'
        };
      }

      return {
        success: false,
        message: `Proxy returned status ${response.status}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Proxy connection failed: ${error.message}`
      };
    }
  }
}
