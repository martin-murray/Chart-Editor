// Server-side suffix mappings for universal exchange and currency detection
// This mirrors the client-side suffix-mappings.ts for consistent exchange data

interface SuffixInfo {
  suffix: string;
  country: string;
  exchange: string;
  fullExchangeName: string;
  currency?: string;
  notes?: string;
}

// Comprehensive suffix mappings from Bloomberg-style ticker suffixes
export const suffixMappings: Record<string, SuffixInfo> = {
  // United States
  ".UW": {
    suffix: ".UW",
    country: "United States",
    exchange: "NASDAQ Global Select Market",
    fullExchangeName: "NASDAQ Global Select Market",
    currency: "USD"
  },
  ".UF": {
    suffix: ".UF",
    country: "United States",
    exchange: "NASDAQ Global Market",
    fullExchangeName: "NASDAQ Global Market",
    currency: "USD"
  },
  ".UQ": {
    suffix: ".UQ",
    country: "United States", 
    exchange: "NASDAQ Capital Market",
    fullExchangeName: "NASDAQ Capital Market",
    currency: "USD"
  },
  ".UN": {
    suffix: ".UN",
    country: "United States",
    exchange: "NYSE",
    fullExchangeName: "New York Stock Exchange",
    currency: "USD"
  },

  // Europe
  ".SE": {
    suffix: ".SE",
    country: "Sweden",
    exchange: "OMX Stockholm",
    fullExchangeName: "Nasdaq Stockholm (OMX Stockholm)",
    currency: "SEK"
  },
  ".MC": {
    suffix: ".MC",
    country: "Spain", 
    exchange: "BME",
    fullExchangeName: "Bolsas y Mercados Españoles (Madrid Stock Exchange)",
    currency: "EUR"
  },
  ".PA": {
    suffix: ".PA",
    country: "France",
    exchange: "Euronext Paris",
    fullExchangeName: "Euronext Paris",
    currency: "EUR"
  },
  ".DE": {
    suffix: ".DE",
    country: "Germany",
    exchange: "XETRA",
    fullExchangeName: "Deutsche Börse XETRA",
    currency: "EUR"
  },
  ".L": {
    suffix: ".L",
    country: "United Kingdom",
    exchange: "LSE",
    fullExchangeName: "London Stock Exchange",
    currency: "GBP"
  },
  ".AS": {
    suffix: ".AS",
    country: "Netherlands",
    exchange: "Euronext Amsterdam", 
    fullExchangeName: "Euronext Amsterdam",
    currency: "EUR"
  },
  ".SW": {
    suffix: ".SW",
    country: "Switzerland",
    exchange: "SIX",
    fullExchangeName: "SIX Swiss Exchange",
    currency: "CHF"
  },
  ".MI": {
    suffix: ".MI",
    country: "Italy",
    exchange: "Borsa Italiana",
    fullExchangeName: "Borsa Italiana (Milan Stock Exchange)",
    currency: "EUR"
  },

  // Asia Pacific
  ".T": {
    suffix: ".T",
    country: "Japan",
    exchange: "TSE",
    fullExchangeName: "Tokyo Stock Exchange",
    currency: "JPY"
  },
  ".HK": {
    suffix: ".HK",
    country: "Hong Kong",
    exchange: "HKEX",
    fullExchangeName: "Hong Kong Stock Exchange",
    currency: "HKD"
  },
  ".AX": {
    suffix: ".AX", 
    country: "Australia",
    exchange: "ASX",
    fullExchangeName: "Australian Securities Exchange",
    currency: "AUD"
  },

  // Canada
  ".TO": {
    suffix: ".TO",
    country: "Canada",
    exchange: "TSX",
    fullExchangeName: "Toronto Stock Exchange",
    currency: "CAD"
  },
  ".V": {
    suffix: ".V",
    country: "Canada",
    exchange: "TSXV",
    fullExchangeName: "TSX Venture Exchange",
    currency: "CAD"
  },

  // Additional European exchanges commonly used
  ".F": {
    suffix: ".F",
    country: "Germany",
    exchange: "Frankfurt",
    fullExchangeName: "Frankfurt Stock Exchange",
    currency: "EUR"
  },
  ".BE": {
    suffix: ".BE",
    country: "Germany",
    exchange: "Berlin",
    fullExchangeName: "Berlin Stock Exchange",
    currency: "EUR"
  },
  ".DU": {
    suffix: ".DU",
    country: "Germany",
    exchange: "Dusseldorf",
    fullExchangeName: "Dusseldorf Stock Exchange",
    currency: "EUR"
  }
};

/**
 * Extract suffix from ticker symbol and return exchange/currency information
 */
export function getExchangeInfoFromSuffix(symbol: string): { exchange: string; currency: string } | null {
  // Look for suffix pattern (dot followed by letters)
  const suffixMatch = symbol.match(/(\.[A-Z]+)$/);
  
  if (!suffixMatch) {
    // No suffix found - could be US stock or needs special handling
    return null;
  }
  
  const suffix = suffixMatch[1];
  const suffixInfo = suffixMappings[suffix];
  
  if (suffixInfo) {
    return {
      exchange: suffixInfo.exchange,
      currency: suffixInfo.currency || 'USD'
    };
  }
  
  return null;
}

/**
 * Get all available suffixes for reference
 */
export function getAllSuffixes(): string[] {
  return Object.keys(suffixMappings).sort();
}

/**
 * Search for suffix information by suffix string
 */
export function searchSuffix(query: string): SuffixInfo | null {
  const cleanQuery = query.trim().toUpperCase();
  
  // Add leading dot if not present
  const searchKey = cleanQuery.startsWith('.') ? cleanQuery : `.${cleanQuery}`;
  
  return suffixMappings[searchKey] || null;
}