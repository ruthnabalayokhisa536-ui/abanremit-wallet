/**
 * Exchange Rate Service
 * Fetches real-time currency exchange rates from ExchangeRate-API
 */

const EXCHANGE_RATE_API_KEY = "b1609040c7d2ac255a64fee8";
const EXCHANGE_RATE_API_URL = "https://v6.exchangerate-api.com/v6";

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
}

export interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
}

/**
 * Exchange Rate Service
 */
export const exchangeRateService = {
  /**
   * Get latest exchange rates for a base currency
   */
  async getLatestRates(baseCurrency: string = "USD"): Promise<ExchangeRates | null> {
    try {
      const response = await fetch(
        `${EXCHANGE_RATE_API_URL}/${EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result !== "success") {
        throw new Error(data["error-type"] || "Failed to fetch exchange rates");
      }

      return {
        base: data.base_code,
        rates: data.conversion_rates,
        lastUpdated: new Date(data.time_last_update_unix * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      return null;
    }
  },

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult | null> {
    try {
      const response = await fetch(
        `${EXCHANGE_RATE_API_URL}/${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}/${amount}`
      );

      if (!response.ok) {
        throw new Error(`Failed to convert currency: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result !== "success") {
        throw new Error(data["error-type"] || "Failed to convert currency");
      }

      return {
        from: data.base_code,
        to: data.target_code,
        amount: amount,
        result: data.conversion_result,
        rate: data.conversion_rate,
      };
    } catch (error) {
      console.error("Error converting currency:", error);
      return null;
    }
  },

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${EXCHANGE_RATE_API_URL}/${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get exchange rate: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result !== "success") {
        throw new Error(data["error-type"] || "Failed to get exchange rate");
      }

      return data.conversion_rate;
    } catch (error) {
      console.error("Error getting exchange rate:", error);
      return null;
    }
  },

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<Record<string, string> | null> {
    try {
      const response = await fetch(
        `${EXCHANGE_RATE_API_URL}/${EXCHANGE_RATE_API_KEY}/codes`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch currencies: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result !== "success") {
        throw new Error(data["error-type"] || "Failed to fetch currencies");
      }

      // Convert array to object
      const currencies: Record<string, string> = {};
      data.supported_codes.forEach(([code, name]: [string, string]) => {
        currencies[code] = name;
      });

      return currencies;
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return null;
    }
  },

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Cache exchange rates (localStorage)
   */
  cacheRates(baseCurrency: string, rates: ExchangeRates): void {
    try {
      const cacheKey = `exchange_rates_${baseCurrency}`;
      localStorage.setItem(cacheKey, JSON.stringify(rates));
    } catch (error) {
      console.error("Error caching rates:", error);
    }
  },

  /**
   * Get cached exchange rates
   */
  getCachedRates(baseCurrency: string, maxAgeMinutes: number = 60): ExchangeRates | null {
    try {
      const cacheKey = `exchange_rates_${baseCurrency}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const rates: ExchangeRates = JSON.parse(cached);
      const lastUpdated = new Date(rates.lastUpdated);
      const now = new Date();
      const ageMinutes = (now.getTime() - lastUpdated.getTime()) / 1000 / 60;

      if (ageMinutes > maxAgeMinutes) {
        return null; // Cache expired
      }

      return rates;
    } catch (error) {
      console.error("Error getting cached rates:", error);
      return null;
    }
  },

  /**
   * Get rates with caching
   */
  async getRatesWithCache(baseCurrency: string = "USD"): Promise<ExchangeRates | null> {
    // Try cache first
    const cached = this.getCachedRates(baseCurrency);
    if (cached) {
      return cached;
    }

    // Fetch fresh rates
    const rates = await this.getLatestRates(baseCurrency);
    if (rates) {
      this.cacheRates(baseCurrency, rates);
    }

    return rates;
  },
};

export default exchangeRateService;
