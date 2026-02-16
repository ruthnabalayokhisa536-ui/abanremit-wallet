/**
 * Africa's Talking Airtime API Integration
 * Documentation: https://developers.africastalking.com/docs/airtime/overview
 */

interface AirtimeRecipient {
  phoneNumber: string;
  currencyCode: string;
  amount: number;
}

interface AirtimeResponse {
  success: boolean;
  message: string;
  numSent: number;
  totalAmount: string;
  totalDiscount: string;
  responses: Array<{
    phoneNumber: string;
    amount: string;
    status: string;
    requestId: string;
    errorMessage?: string;
    discount: string;
  }>;
}

interface SendAirtimeRequest {
  phoneNumber: string;
  amount: number;
  currencyCode?: string;
}

interface SendAirtimeResponse {
  success: boolean;
  message: string;
  requestId?: string;
  discount?: number;
  error?: string;
}

export const africasTalkingAirtimeService = {
  /**
   * Get API credentials from environment
   */
  getCredentials() {
    const apiKey = import.meta.env.VITE_AFRICAS_TALKING_API_KEY;
    const username = import.meta.env.VITE_AFRICAS_TALKING_USERNAME;
    const environment = import.meta.env.VITE_AFRICAS_TALKING_ENVIRONMENT || 'sandbox';

    if (!apiKey || !username) {
      throw new Error('Africa\'s Talking credentials not configured');
    }

    return { apiKey, username, environment };
  },

  /**
   * Get API base URL
   */
  getBaseUrl(environment: string): string {
    return environment === 'production'
      ? 'https://api.africastalking.com/version1'
      : 'https://api.sandbox.africastalking.com/version1';
  },

  /**
   * Format phone number for Africa's Talking
   * Must be in format: +254XXXXXXXXX
   */
  formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '+254' + cleaned.substring(1);
    }

    // If starts with 254, add +
    if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    // If doesn't start with +, assume Kenya
    if (!cleaned.startsWith('+')) {
      cleaned = '+254' + cleaned;
    }

    return cleaned;
  },

  /**
   * Send airtime to a phone number
   */
  async sendAirtime(request: SendAirtimeRequest): Promise<SendAirtimeResponse> {
    try {
      const { apiKey, username, environment } = this.getCredentials();
      const baseUrl = this.getBaseUrl(environment);

      // Format phone number
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      // Prepare request
      const recipients: AirtimeRecipient[] = [
        {
          phoneNumber,
          currencyCode: request.currencyCode || 'KES',
          amount: request.amount,
        },
      ];

      // Make API call
      const response = await fetch(`${baseUrl}/airtime/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username,
          recipients,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Africa\'s Talking API error:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: AirtimeResponse = await response.json();

      // Check if airtime was sent successfully
      if (data.numSent > 0 && data.responses && data.responses.length > 0) {
        const firstResponse = data.responses[0];

        if (firstResponse.status === 'Sent') {
          return {
            success: true,
            message: `Airtime sent successfully to ${phoneNumber}`,
            requestId: firstResponse.requestId,
            discount: parseFloat(firstResponse.discount) || 0,
          };
        } else {
          return {
            success: false,
            message: firstResponse.errorMessage || 'Failed to send airtime',
            error: firstResponse.errorMessage,
          };
        }
      }

      return {
        success: false,
        message: data.message || 'Failed to send airtime',
        error: 'NO_RECIPIENTS_SENT',
      };
    } catch (error: any) {
      console.error('Send airtime error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send airtime',
        error: error.message,
      };
    }
  },

  /**
   * Send airtime to multiple recipients
   */
  async sendBulkAirtime(recipients: SendAirtimeRequest[]): Promise<{
    success: boolean;
    message: string;
    results: SendAirtimeResponse[];
  }> {
    try {
      const { apiKey, username, environment } = this.getCredentials();
      const baseUrl = this.getBaseUrl(environment);

      // Format recipients
      const formattedRecipients: AirtimeRecipient[] = recipients.map((r) => ({
        phoneNumber: this.formatPhoneNumber(r.phoneNumber),
        currencyCode: r.currencyCode || 'KES',
        amount: r.amount,
      }));

      // Make API call
      const response = await fetch(`${baseUrl}/airtime/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username,
          recipients: formattedRecipients,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: AirtimeResponse = await response.json();

      // Map responses
      const results: SendAirtimeResponse[] = data.responses.map((r) => ({
        success: r.status === 'Sent',
        message: r.status === 'Sent' ? 'Airtime sent successfully' : r.errorMessage || 'Failed',
        requestId: r.requestId,
        discount: parseFloat(r.discount) || 0,
        error: r.errorMessage,
      }));

      return {
        success: data.numSent > 0,
        message: `Sent airtime to ${data.numSent} of ${recipients.length} recipients`,
        results,
      };
    } catch (error: any) {
      console.error('Send bulk airtime error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send bulk airtime',
        results: [],
      };
    }
  },

  /**
   * Get supported networks
   * Note: Africa's Talking supports all major Kenyan networks
   */
  getSupportedNetworks() {
    return [
      {
        code: 'SAFARICOM',
        name: 'Safaricom',
        country: 'Kenya',
        currencyCode: 'KES',
        minAmount: 10,
        maxAmount: 10000,
      },
      {
        code: 'AIRTEL',
        name: 'Airtel',
        country: 'Kenya',
        currencyCode: 'KES',
        minAmount: 10,
        maxAmount: 10000,
      },
      {
        code: 'TELKOM',
        name: 'Telkom',
        country: 'Kenya',
        currencyCode: 'KES',
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
    // Kenya phone numbers: +254XXXXXXXXX (12 characters)
    return /^\+254\d{9}$/.test(formatted);
  },

  /**
   * Get network from phone number
   */
  getNetworkFromPhone(phone: string): string | null {
    const formatted = this.formatPhoneNumber(phone);

    // Safaricom: +2547XX, +2541XX
    if (/^\+254(7[0-9]|1[0-9])\d{7}$/.test(formatted)) {
      return 'SAFARICOM';
    }

    // Airtel: +2547XX (specific ranges)
    if (/^\+254(73|78|79|10|11)\d{7}$/.test(formatted)) {
      return 'AIRTEL';
    }

    // Telkom: +2547XX (specific ranges)
    if (/^\+254(77)\d{7}$/.test(formatted)) {
      return 'TELKOM';
    }

    return null;
  },
};

export default africasTalkingAirtimeService;
