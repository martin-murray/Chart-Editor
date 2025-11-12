const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";
const BASE_URL = "https://www.alphavantage.co/query";

interface AlphaVantageTimeSeriesDaily {
  [date: string]: {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  };
}

interface AlphaVantageResponse {
  "Meta Data"?: {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Output Size": string;
    "5. Time Zone": string;
  };
  "Time Series (Daily)"?: AlphaVantageTimeSeriesDaily;
  "Error Message"?: string;
  "Note"?: string;
}

export class AlphaVantageService {
  private async makeRequest(params: Record<string, string>): Promise<any> {
    const queryParams = new URLSearchParams({
      ...params,
      apikey: ALPHA_VANTAGE_API_KEY
    });
    const url = `${BASE_URL}?${queryParams}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': 'Market-Dashboard/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for API errors
      if (data["Error Message"]) {
        console.error(`Alpha Vantage error: ${data["Error Message"]}`);
        return null;
      }
      
      // Check for rate limit
      if (data["Note"]) {
        console.warn(`Alpha Vantage rate limit: ${data["Note"]}`);
        return null;
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Alpha Vantage request timeout');
        throw new Error('Request timeout');
      }
      console.error('Error fetching from Alpha Vantage:', error);
      throw error;
    }
  }

  /**
   * Get historical daily data for a symbol
   * Returns data in Finnhub-compatible format for easy integration
   */
  async getStockCandles(symbol: string, from: number, to: number): Promise<any> {
    try {
      console.log(`📊 Alpha Vantage fallback: Fetching historical data for ${symbol}`);
      
      const response = await this.makeRequest({
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        outputsize: 'full'
      }) as AlphaVantageResponse;
      
      if (!response || !response["Time Series (Daily)"]) {
        console.log(`❌ No data from Alpha Vantage for ${symbol}`);
        return null;
      }
      
      const timeSeries = response["Time Series (Daily)"];
      
      // Convert to Finnhub format and filter by date range
      const fromDate = new Date(from * 1000);
      const toDate = new Date(to * 1000);
      
      const candleData = {
        s: 'ok' as const,
        t: [] as number[],
        o: [] as number[],
        h: [] as number[],
        l: [] as number[],
        c: [] as number[],
        v: [] as number[]
      };
      
      // Sort dates and filter by range
      const dates = Object.keys(timeSeries).sort();
      
      for (const dateStr of dates) {
        const date = new Date(dateStr + 'T00:00:00Z');
        
        // Only include dates within the requested range
        if (date >= fromDate && date <= toDate) {
          const data = timeSeries[dateStr];
          
          candleData.t.push(Math.floor(date.getTime() / 1000));
          candleData.o.push(parseFloat(data["1. open"]));
          candleData.h.push(parseFloat(data["2. high"]));
          candleData.l.push(parseFloat(data["3. low"]));
          candleData.c.push(parseFloat(data["4. close"]));
          candleData.v.push(parseFloat(data["5. volume"]));
        }
      }
      
      if (candleData.t.length === 0) {
        console.log(`❌ No data in date range for ${symbol}`);
        return null;
      }
      
      console.log(`✅ Alpha Vantage: Retrieved ${candleData.t.length} data points for ${symbol}`);
      console.log(`   Date range: ${new Date(candleData.t[0] * 1000).toLocaleDateString()} to ${new Date(candleData.t[candleData.t.length - 1] * 1000).toLocaleDateString()}`);
      
      return candleData;
    } catch (error) {
      console.error(`Error fetching candles from Alpha Vantage for ${symbol}:`, error);
      return null;
    }
  }
}

export const alphaVantageService = new AlphaVantageService();
