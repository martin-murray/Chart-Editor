// Market holidays for major global exchanges
// Data for 2024-2026 to ensure current relevance

export interface MarketHoliday {
  name: string;
  date: string; // YYYY-MM-DD format
  market: string;
  country: string;
  isHalfDay?: boolean; // If market closes early
  earlyCloseTime?: string; // Time in local market time if half day
}

export const MARKET_HOLIDAYS: MarketHoliday[] = [
  // US Market Holidays 2024-2026
  { name: "New Year's Day", date: "2024-01-01", market: "US", country: "United States" },
  { name: "Martin Luther King Jr. Day", date: "2024-01-15", market: "US", country: "United States" },
  { name: "Presidents' Day", date: "2024-02-19", market: "US", country: "United States" },
  { name: "Good Friday", date: "2024-03-29", market: "US", country: "United States" },
  { name: "Memorial Day", date: "2024-05-27", market: "US", country: "United States" },
  { name: "Juneteenth", date: "2024-06-19", market: "US", country: "United States" },
  { name: "Independence Day", date: "2024-07-04", market: "US", country: "United States" },
  { name: "Labor Day", date: "2024-09-02", market: "US", country: "United States" },
  { name: "Thanksgiving Day", date: "2024-11-28", market: "US", country: "United States" },
  { name: "Christmas Day", date: "2024-12-25", market: "US", country: "United States" },
  
  // US Half Days (early close at 1 PM ET)
  { name: "Black Friday", date: "2024-11-29", market: "US", country: "United States", isHalfDay: true, earlyCloseTime: "13:00" },
  { name: "Christmas Eve", date: "2024-12-24", market: "US", country: "United States", isHalfDay: true, earlyCloseTime: "13:00" },

  // US Market Holidays 2025
  { name: "New Year's Day", date: "2025-01-01", market: "US", country: "United States" },
  { name: "Martin Luther King Jr. Day", date: "2025-01-20", market: "US", country: "United States" },
  { name: "Presidents' Day", date: "2025-02-17", market: "US", country: "United States" },
  { name: "Good Friday", date: "2025-04-18", market: "US", country: "United States" },
  { name: "Memorial Day", date: "2025-05-26", market: "US", country: "United States" },
  { name: "Juneteenth", date: "2025-06-19", market: "US", country: "United States" },
  { name: "Independence Day", date: "2025-07-04", market: "US", country: "United States" },
  { name: "Labor Day", date: "2025-09-01", market: "US", country: "United States" },
  { name: "Thanksgiving Day", date: "2025-11-27", market: "US", country: "United States" },
  { name: "Christmas Day", date: "2025-12-25", market: "US", country: "United States" },
  
  // US Half Days 2025
  { name: "Black Friday", date: "2025-11-28", market: "US", country: "United States", isHalfDay: true, earlyCloseTime: "13:00" },
  { name: "Christmas Eve", date: "2025-12-24", market: "US", country: "United States", isHalfDay: true, earlyCloseTime: "13:00" },

  // UK Market Holidays 2024-2025
  { name: "New Year's Day", date: "2024-01-01", market: "UK", country: "United Kingdom" },
  { name: "Good Friday", date: "2024-03-29", market: "UK", country: "United Kingdom" },
  { name: "Easter Monday", date: "2024-04-01", market: "UK", country: "United Kingdom" },
  { name: "Early May Bank Holiday", date: "2024-05-06", market: "UK", country: "United Kingdom" },
  { name: "Spring Bank Holiday", date: "2024-05-27", market: "UK", country: "United Kingdom" },
  { name: "Summer Bank Holiday", date: "2024-08-26", market: "UK", country: "United Kingdom" },
  { name: "Christmas Day", date: "2024-12-25", market: "UK", country: "United Kingdom" },
  { name: "Boxing Day", date: "2024-12-26", market: "UK", country: "United Kingdom" },

  { name: "New Year's Day", date: "2025-01-01", market: "UK", country: "United Kingdom" },
  { name: "Good Friday", date: "2025-04-18", market: "UK", country: "United Kingdom" },
  { name: "Easter Monday", date: "2025-04-21", market: "UK", country: "United Kingdom" },
  { name: "Early May Bank Holiday", date: "2025-05-05", market: "UK", country: "United Kingdom" },
  { name: "Spring Bank Holiday", date: "2025-05-26", market: "UK", country: "United Kingdom" },
  { name: "Summer Bank Holiday", date: "2025-08-25", market: "UK", country: "United Kingdom" },
  { name: "Christmas Day", date: "2025-12-25", market: "UK", country: "United Kingdom" },
  { name: "Boxing Day", date: "2025-12-26", market: "UK", country: "United Kingdom" },

  // Germany Market Holidays 2024-2025
  { name: "New Year's Day", date: "2024-01-01", market: "Germany", country: "Germany" },
  { name: "Good Friday", date: "2024-03-29", market: "Germany", country: "Germany" },
  { name: "Easter Monday", date: "2024-04-01", market: "Germany", country: "Germany" },
  { name: "Labour Day", date: "2024-05-01", market: "Germany", country: "Germany" },
  { name: "Christmas Eve", date: "2024-12-24", market: "Germany", country: "Germany" },
  { name: "Christmas Day", date: "2024-12-25", market: "Germany", country: "Germany" },
  { name: "Boxing Day", date: "2024-12-26", market: "Germany", country: "Germany" },
  { name: "New Year's Eve", date: "2024-12-31", market: "Germany", country: "Germany" },

  { name: "New Year's Day", date: "2025-01-01", market: "Germany", country: "Germany" },
  { name: "Good Friday", date: "2025-04-18", market: "Germany", country: "Germany" },
  { name: "Easter Monday", date: "2025-04-21", market: "Germany", country: "Germany" },
  { name: "Labour Day", date: "2025-05-01", market: "Germany", country: "Germany" },
  { name: "Christmas Eve", date: "2025-12-24", market: "Germany", country: "Germany" },
  { name: "Christmas Day", date: "2025-12-25", market: "Germany", country: "Germany" },
  { name: "Boxing Day", date: "2025-12-26", market: "Germany", country: "Germany" },
  { name: "New Year's Eve", date: "2025-12-31", market: "Germany", country: "Germany" },

  // Japan Market Holidays 2024-2025
  { name: "New Year's Day", date: "2024-01-01", market: "Japan", country: "Japan" },
  { name: "New Year Holiday", date: "2024-01-02", market: "Japan", country: "Japan" },
  { name: "New Year Holiday", date: "2024-01-03", market: "Japan", country: "Japan" },
  { name: "Coming of Age Day", date: "2024-01-08", market: "Japan", country: "Japan" },
  { name: "National Foundation Day", date: "2024-02-11", market: "Japan", country: "Japan" },
  { name: "Emperor's Birthday", date: "2024-02-23", market: "Japan", country: "Japan" },
  { name: "Vernal Equinox Day", date: "2024-03-20", market: "Japan", country: "Japan" },
  { name: "Showa Day", date: "2024-04-29", market: "Japan", country: "Japan" },
  { name: "Constitution Memorial Day", date: "2024-05-03", market: "Japan", country: "Japan" },
  { name: "Greenery Day", date: "2024-05-04", market: "Japan", country: "Japan" },
  { name: "Children's Day", date: "2024-05-05", market: "Japan", country: "Japan" },
  { name: "Marine Day", date: "2024-07-15", market: "Japan", country: "Japan" },
  { name: "Mountain Day", date: "2024-08-11", market: "Japan", country: "Japan" },
  { name: "Respect for the Aged Day", date: "2024-09-16", market: "Japan", country: "Japan" },
  { name: "Autumnal Equinox Day", date: "2024-09-22", market: "Japan", country: "Japan" },
  { name: "Sports Day", date: "2024-10-14", market: "Japan", country: "Japan" },
  { name: "Culture Day", date: "2024-11-03", market: "Japan", country: "Japan" },
  { name: "Labour Thanksgiving Day", date: "2024-11-23", market: "Japan", country: "Japan" },
  { name: "New Year's Eve", date: "2024-12-31", market: "Japan", country: "Japan" },

  { name: "New Year's Day", date: "2025-01-01", market: "Japan", country: "Japan" },
  { name: "New Year Holiday", date: "2025-01-02", market: "Japan", country: "Japan" },
  { name: "New Year Holiday", date: "2025-01-03", market: "Japan", country: "Japan" },
  { name: "Coming of Age Day", date: "2025-01-13", market: "Japan", country: "Japan" },
  { name: "National Foundation Day", date: "2025-02-11", market: "Japan", country: "Japan" },
  { name: "Emperor's Birthday", date: "2025-02-23", market: "Japan", country: "Japan" },
  { name: "Vernal Equinox Day", date: "2025-03-20", market: "Japan", country: "Japan" },
  { name: "Showa Day", date: "2025-04-29", market: "Japan", country: "Japan" },
  { name: "Constitution Memorial Day", date: "2025-05-03", market: "Japan", country: "Japan" },
  { name: "Greenery Day", date: "2025-05-04", market: "Japan", country: "Japan" },
  { name: "Children's Day", date: "2025-05-05", market: "Japan", country: "Japan" },
  { name: "Marine Day", date: "2025-07-21", market: "Japan", country: "Japan" },
  { name: "Mountain Day", date: "2025-08-11", market: "Japan", country: "Japan" },
  { name: "Respect for the Aged Day", date: "2025-09-15", market: "Japan", country: "Japan" },
  { name: "Autumnal Equinox Day", date: "2025-09-23", market: "Japan", country: "Japan" },
  { name: "Sports Day", date: "2025-10-13", market: "Japan", country: "Japan" },
  { name: "Culture Day", date: "2025-11-03", market: "Japan", country: "Japan" },
  { name: "Labour Thanksgiving Day", date: "2025-11-23", market: "Japan", country: "Japan" },
  { name: "New Year's Eve", date: "2025-12-31", market: "Japan", country: "Japan" },
];

// Map exchange suffixes to markets for holiday lookup
export const EXCHANGE_TO_MARKET_MAP: Record<string, string> = {
  // US exchanges
  'NYSE': 'US',
  'NASDAQ': 'US',
  'AMEX': 'US',
  'New York Stock Exchange': 'US',
  'NASDAQ Global Select': 'US',
  'NASDAQ Capital Market': 'US',
  'NYSE American': 'US',
  'US': 'US',
  
  // UK exchanges
  'LSE': 'UK',
  'L': 'UK',
  'London Stock Exchange': 'UK',
  'LSE Main Market': 'UK',
  'AIM': 'UK',
  'UK': 'UK',
  
  // German exchanges
  'XETRA': 'Germany',
  'FWB': 'Germany',
  'Frankfurt Stock Exchange': 'Germany',
  'Stuttgart Stock Exchange': 'Germany',
  'Munich Stock Exchange': 'Germany',
  'Germany': 'Germany',
  
  // Japanese exchanges
  'TSE': 'Japan',
  'T': 'Japan',
  'Tokyo Stock Exchange': 'Japan',
  'Japan Exchange Group': 'Japan',
  'Osaka Exchange': 'Japan',
  'Japan': 'Japan',
  
  // Additional exchanges
  'Euronext Paris': 'France',
  'PA': 'France',
  'Euronext Amsterdam': 'Netherlands', 
  'Euronext Brussels': 'Belgium',
  'SIX Swiss Exchange': 'Switzerland',
  'Toronto Stock Exchange': 'Canada',
  'TO': 'Canada',
  'Australian Securities Exchange': 'Australia',
  'AX': 'Australia',
  'Hong Kong Stock Exchange': 'Hong Kong',
  'HK': 'Hong Kong',
};

/**
 * Get upcoming market holidays for a specific market or all markets
 * @param market Optional market filter (e.g., 'US', 'UK', 'Germany', 'Japan')
 * @param daysAhead Number of days to look ahead (default: 30)
 * @returns Array of upcoming holidays
 */
export function getUpcomingHolidays(market?: string, daysAhead: number = 30): MarketHoliday[] {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + daysAhead);
  
  const todayStr = today.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];
  
  return MARKET_HOLIDAYS
    .filter(holiday => {
      // Filter by date range
      if (holiday.date < todayStr || holiday.date > maxDateStr) return false;
      
      // Filter by market if specified
      if (market && holiday.market !== market) return false;
      
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5); // Limit to next 5 holidays
}

/**
 * Check if a specific date is a market holiday
 * @param date Date string in YYYY-MM-DD format
 * @param market Market to check
 * @returns Holiday info if it's a holiday, null otherwise
 */
export function isMarketHoliday(date: string, market: string): MarketHoliday | null {
  return MARKET_HOLIDAYS.find(holiday => 
    holiday.date === date && holiday.market === market
  ) || null;
}

/**
 * Get market name from exchange suffix or name
 */
export function getMarketFromExchange(exchange: string): string | undefined {
  return EXCHANGE_TO_MARKET_MAP[exchange];
}