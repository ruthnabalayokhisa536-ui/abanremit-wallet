/**
 * Instalipa Airtime API Integration
 * Provider: Instalipa Kenya
 * Documentation: https://business.instalipa.co.ke/
 */

interface InstalipaAirtimeRequest {
  phoneNumber: string;
  amount: number;
  network: string;
  reference?: string;
}

interface InstalipaAirtimeResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  requestId?: string;
  status?: string;
  error?: string;
}

export const instalipaAirtimeService = {
  /**
   * Get API credentials from environment
   */
  getCredentials() {
    const apiUrl = import.meta.env.VITE_AIRTIME_API_URL || 'https://business.instalipa.co.ke';
    const consumerKey = import.meta.env.VITE_AIRTIME_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_AIRTIME_CONSUMER_SECRET;
    const callbackUrl = 'https://abancool.com/functions/v1/airtime-callback_url';

    // Build array of missing credential names
    const missing: string[] = [];
    if (!consumerKey) missing.push('VITE_AIRTIME_CONSUMER_KEY');
    if (!consumerSecret) missing.push('VITE_AIRTIME_CONSUMER_SECRET');

    if (missing.length > 0) {
      throw new Error(
        `Instalipa credentials not configured. Missing: ${missing.join(', ')}. ` +
        `Please add these to your .env file. Refer to docs/INSTALIPA_SETUP.md for setup instructions.`
      );
    }

    return { apiUrl, consumerKey, consumerSecret, callbackUrl };
  },

  /**
   * Get OAuth token
   */
  async getAccessToken(): Promise<string> {
    try {
      const { apiUrl, consumerKey, consumerSecret } = this.getCredentials();

      const credentials = btoa(`${consumerKey}:${consumerSecret}`);

      const response = await fetch(`${apiUrl}/api/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error: any) {
      console.error('Get access token error:', error);
      throw error;
    }
  },

  /**
   * Format phone number for Instalipa
   * Must be in format: 254XXXXXXXXX (no +)
   */
  formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, parentheses, plus
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }

    // If doesn't start with 254, assume Kenya
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  },

  /**
   * Get network code from network name
   */
  getNetworkCode(network: string): string {
    const networkMap: Record<string, string> = {
      'safaricom': 'SAFARICOM',
      'airtel': 'AIRTEL',
      'telkom': 'TELKOM',
    };

    return networkMap[network.toLowerCase()] || network.toUpperCase();
  },

  /**
   * Purchase airtime via Supabase Edge Function
   * No mock mode - requires proper Edge Function deployment
   */
  async purchaseAirtime(request: InstalipaAirtimeRequest): Promise<InstalipaAirtimeResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured. Please set VITE_SUPABASE_URL in your .env file.');
      }

      // Validate credentials are configured
      this.getCredentials();

      // Format phone number
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      // Get network code
      const networkCode = this.getNetworkCode(request.network);

      // Generate reference if not provided
      const reference = request.reference || `AIRTIME-${Date.now()}`;

      // Prepare request payload
      const payload = {
        phoneNumber,
        amount: request.amount,
        network: networkCode,
        reference,
      };

      console.log('Instalipa airtime request (via Edge Function):', payload);

      // Call Supabase Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/instalipa-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      console.log('Instalipa airtime response:', data);

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Airtime purchase failed',
          error: data.error || 'PURCHASE_FAILED',
        };
      }

      // Extract response from Edge Function
      const result = data.data;

      // Check response status
      if (result.status === 'success' || result.status === 'pending') {
        return {
          success: true,
          message: result.message || 'Airtime purchase initiated successfully',
          transactionId: result.transactionId || result.requestId || reference,
          requestId: result.requestId,
          status: result.status,
        };
      }

      return {
        success: false,
        message: result.message || 'Airtime purchase failed',
        error: result.error || 'PURCHASE_FAILED',
      };
    } catch (error: any) {
      console.error('Purchase airtime error:', error);
      return {
        success: false,
        message: error.message || 'Failed to purchase airtime. Please ensure the Instalipa Edge Function is deployed.',
        error: error.message,
      };
    }
  },

  /**
   * Check transaction status
   */
  async checkStatus(transactionId: string): Promise<any> {
    try {
      const { apiUrl } = this.getCredentials();
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${apiUrl}/api/v1/airtime/status/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Check status error:', error);
      return null;
    }
  },

  /**
   * Get supported networks
   */
  getSupportedNetworks() {
    return [
      {
        code: 'SAFARICOM',
        name: 'Safaricom',
        country: 'Kenya',
        minAmount: 10,
        maxAmount: 10000,
      },
      {
        code: 'AIRTEL',
        name: 'Airtel',
        country: 'Kenya',
        minAmount: 10,
        maxAmount: 10000,
      },
      {
        code: 'TELKOM',
        name: 'Telkom',
        country: 'Kenya',
        minAmount: 10,
        maxAmount: 10000,
      },
    ];
  },

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Kenya phone numbers: 254XXXXXXXXX (12 characters)
    return /^254\d{9}$/.test(formatted);
  },
};

export default instalipaAirtimeService;
