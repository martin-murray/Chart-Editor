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
  },

  // Latin America
  ".MX": {
    suffix: ".MX",
    country: "Mexico",
    exchange: "BMV",
    fullExchangeName: "Bolsa Mexicana de Valores (Mexican Stock Exchange)",
    currency: "MXN",
    notes: "Mexican stocks listed on the Mexican Stock Exchange's Global Market"
  },
  ".SA": {
    suffix: ".SA",
    country: "Brazil",
    exchange: "B3",
    fullExchangeName: "B3 - Brasil Bolsa Balcão",
    currency: "BRL",
    notes: "Brazilian stocks listed on B3"
  },

  // Additional Asia Pacific
  ".SI": {
    suffix: ".SI",
    country: "Singapore",
    exchange: "SGX",
    fullExchangeName: "Singapore Exchange",
    currency: "SGD",
    notes: "Singapore stocks listed on SGX"
  },
  ".NZ": {
    suffix: ".NZ",
    country: "New Zealand",
    exchange: "NZX",
    fullExchangeName: "New Zealand Exchange",
    currency: "NZD",
    notes: "New Zealand stocks listed on NZX"
  },
  ".TW": {
    suffix: ".TW",
    country: "Taiwan",
    exchange: "TWSE",
    fullExchangeName: "Taiwan Stock Exchange",
    currency: "TWD",
    notes: "Taiwanese stocks listed on TWSE"
  },
  ".KL": {
    suffix: ".KL",
    country: "Malaysia",
    exchange: "Bursa Malaysia",
    fullExchangeName: "Bursa Malaysia",
    currency: "MYR",
    notes: "Malaysian stocks listed on Bursa Malaysia"
  },
  ".JK": {
    suffix: ".JK",
    country: "Indonesia",
    exchange: "IDX",
    fullExchangeName: "Indonesia Stock Exchange",
    currency: "IDR",
    notes: "Indonesian stocks listed on IDX"
  },
  ".BK": {
    suffix: ".BK",
    country: "Thailand",
    exchange: "SET",
    fullExchangeName: "Stock Exchange of Thailand",
    currency: "THB",
    notes: "Thai stocks listed on SET"
  },

  // Middle East
  ".TA": {
    suffix: ".TA",
    country: "Israel",
    exchange: "TASE",
    fullExchangeName: "Tel Aviv Stock Exchange",
    currency: "ILS",
    notes: "Israeli stocks listed on TASE"
  },

  // Additional Europe
  ".VI": {
    suffix: ".VI",
    country: "Austria",
    exchange: "Vienna",
    fullExchangeName: "Vienna Stock Exchange",
    currency: "EUR",
    notes: "Austrian stocks listed on Vienna Stock Exchange"
  },
  ".IR": {
    suffix: ".IR",
    country: "Ireland",
    exchange: "Euronext Dublin",
    fullExchangeName: "Euronext Dublin",
    currency: "EUR",
    notes: "Irish stocks listed on Euronext Dublin"
  },
  ".WA": {
    suffix: ".WA",
    country: "Poland",
    exchange: "WSE",
    fullExchangeName: "Warsaw Stock Exchange",
    currency: "PLN",
    notes: "Polish stocks listed on WSE"
  },
  ".LS": {
    suffix: ".LS",
    country: "Portugal",
    exchange: "Euronext Lisbon",
    fullExchangeName: "Euronext Lisbon",
    currency: "EUR",
    notes: "Portuguese stocks listed on Euronext Lisbon"
  },
  ".AT": {
    suffix: ".AT",
    country: "Greece",
    exchange: "ATHEX",
    fullExchangeName: "Athens Stock Exchange",
    currency: "EUR",
    notes: "Greek stocks listed on ATHEX"
  },
  ".IS": {
    suffix: ".IS",
    country: "Iceland",
    exchange: "Nasdaq Iceland",
    fullExchangeName: "Nasdaq Iceland",
    currency: "ISK",
    notes: "Icelandic stocks listed on Nasdaq Iceland"
  },
  ".PR": {
    suffix: ".PR",
    country: "Czech Republic",
    exchange: "Prague Stock Exchange",
    fullExchangeName: "Prague Stock Exchange",
    currency: "CZK",
    notes: "Czech stocks listed on Prague Stock Exchange"
  },

  // Additional Global Markets (from Bloomberg exchange data)
  ".AB": {
    suffix: ".AB",
    country: "Saudi Arabia",
    exchange: "Saudi Stock Exchange",
    fullExchangeName: "Saudi Stock Exchange (Tadawul)",
    currency: "SAR"
  },
  ".BD": {
    suffix: ".BD",
    country: "Bangladesh",
    exchange: "Dhaka Stock Exchange",
    fullExchangeName: "Dhaka Stock Exchange",
    currency: "BDT"
  },
  ".BU": {
    suffix: ".BU",
    country: "Bulgaria",
    exchange: "Bulgarian Stock Exchange",
    fullExchangeName: "Bulgarian Stock Exchange",
    currency: "BGN"
  },
  ".CR": {
    suffix: ".CR",
    country: "Costa Rica",
    exchange: "Costa Rica Stock Exchange",
    fullExchangeName: "Bolsa Nacional de Valores",
    currency: "CRC"
  },
  ".CY": {
    suffix: ".CY",
    country: "Cyprus",
    exchange: "Cyprus Stock Exchange",
    fullExchangeName: "Cyprus Stock Exchange",
    currency: "EUR"
  },
  ".EC": {
    suffix: ".EC",
    country: "Egypt",
    exchange: "Egyptian Exchange",
    fullExchangeName: "Egyptian Exchange (EGX)",
    currency: "EGP"
  },
  ".JR": {
    suffix: ".JR",
    country: "Jordan",
    exchange: "Amman Stock Exchange",
    fullExchangeName: "Amman Stock Exchange",
    currency: "JOD"
  },
  ".JT": {
    suffix: ".JT",
    country: "Japan",
    exchange: "Tokyo Stock Exchange",
    fullExchangeName: "Tokyo Stock Exchange",
    currency: "JPY"
  },
  ".KH": {
    suffix: ".KH",
    country: "Cambodia",
    exchange: "Cambodia Securities Exchange",
    fullExchangeName: "Cambodia Securities Exchange",
    currency: "KHR"
  },
  ".KK": {
    suffix: ".KK",
    country: "Kuwait",
    exchange: "Kuwait Stock Exchange",
    fullExchangeName: "Kuwait Stock Exchange (Boursa Kuwait)",
    currency: "KWD"
  },
  ".KN": {
    suffix: ".KN",
    country: "Kenya",
    exchange: "Nairobi Securities Exchange",
    fullExchangeName: "Nairobi Securities Exchange",
    currency: "KES"
  },
  ".KP": {
    suffix: ".KP",
    country: "South Korea",
    exchange: "Korea Exchange",
    fullExchangeName: "Korea Exchange (KRX)",
    currency: "KRW"
  },
  ".KQ": {
    suffix: ".KQ",
    country: "South Korea",
    exchange: "KOSDAQ",
    fullExchangeName: "Korea Exchange (KOSDAQ)",
    currency: "KRW"
  },
  ".KZ": {
    suffix: ".KZ",
    country: "Kazakhstan",
    exchange: "Kazakhstan Stock Exchange",
    fullExchangeName: "Kazakhstan Stock Exchange",
    currency: "KZT"
  },
  ".LK": {
    suffix: ".LK",
    country: "Sri Lanka",
    exchange: "Colombo Stock Exchange",
    fullExchangeName: "Colombo Stock Exchange",
    currency: "LKR"
  },
  ".MO": {
    suffix: ".MO",
    country: "Mongolia",
    exchange: "Mongolian Stock Exchange",
    fullExchangeName: "Mongolian Stock Exchange",
    currency: "MNT"
  },
  ".PE": {
    suffix: ".PE",
    country: "Peru",
    exchange: "Lima Stock Exchange",
    fullExchangeName: "Bolsa de Valores de Lima",
    currency: "PEN"
  },
  ".PH": {
    suffix: ".PH",
    country: "Philippines",
    exchange: "Philippine Stock Exchange",
    fullExchangeName: "Philippine Stock Exchange",
    currency: "PHP"
  },
  ".PK": {
    suffix: ".PK",
    country: "Pakistan",
    exchange: "Pakistan Stock Exchange",
    fullExchangeName: "Pakistan Stock Exchange",
    currency: "PKR"
  },
  ".QA": {
    suffix: ".QA",
    country: "Qatar",
    exchange: "Qatar Stock Exchange",
    fullExchangeName: "Qatar Stock Exchange",
    currency: "QAR"
  },
  ".RO": {
    suffix: ".RO",
    country: "Romania",
    exchange: "Bucharest Stock Exchange",
    fullExchangeName: "Bucharest Stock Exchange",
    currency: "RON"
  },
  ".SK": {
    suffix: ".SK",
    country: "Slovakia",
    exchange: "Bratislava Stock Exchange",
    fullExchangeName: "Bratislava Stock Exchange",
    currency: "EUR"
  },
  ".TU": {
    suffix: ".TU",
    country: "Tunisia",
    exchange: "Tunis Stock Exchange",
    fullExchangeName: "Bourse de Tunis",
    currency: "TND"
  },
  ".UA": {
    suffix: ".UA",
    country: "Ukraine",
    exchange: "Ukrainian Exchange",
    fullExchangeName: "Ukrainian Exchange",
    currency: "UAH"
  },
  ".UY": {
    suffix: ".UY",
    country: "Uruguay",
    exchange: "Montevideo Stock Exchange",
    fullExchangeName: "Bolsa de Valores de Montevideo",
    currency: "UYU"
  },
  ".VB": {
    suffix: ".VB",
    country: "Bolivia",
    exchange: "Bolivian Stock Exchange",
    fullExchangeName: "Bolsa Boliviana de Valores",
    currency: "BOB"
  },
  ".VH": {
    suffix: ".VH",
    country: "Vietnam",
    exchange: "Hanoi Stock Exchange",
    fullExchangeName: "Hanoi Stock Exchange",
    currency: "VND"
  },
  ".VM": {
    suffix: ".VM",
    country: "Vietnam",
    exchange: "Ho Chi Minh Stock Exchange",
    fullExchangeName: "Ho Chi Minh Stock Exchange",
    currency: "VND"
  },
  ".ZH": {
    suffix: ".ZH",
    country: "Zimbabwe",
    exchange: "Zimbabwe Stock Exchange",
    fullExchangeName: "Zimbabwe Stock Exchange",
    currency: "ZWL"
  },
  ".ZL": {
    suffix: ".ZL",
    country: "Zambia",
    exchange: "Lusaka Stock Exchange",
    fullExchangeName: "Lusaka Stock Exchange",
    currency: "ZMW"
  }
};

/**
 * Extract suffix from ticker symbol and return exchange/currency information
 * Case-insensitive and robust suffix detection
 */
export function getExchangeInfoFromSuffix(symbol: string): { exchange: string; currency: string; fullExchangeName?: string } | null {
  // Look for suffix pattern (dot followed by letters) - case insensitive
  const suffixMatch = symbol.toUpperCase().match(/(\.[A-Z]+)$/);
  
  if (!suffixMatch) {
    // No suffix found - could be US stock or needs special handling
    return null;
  }
  
  const suffix = suffixMatch[1];
  const suffixInfo = suffixMappings[suffix];
  
  if (suffixInfo) {
    return {
      exchange: suffixInfo.exchange,
      currency: suffixInfo.currency || 'USD',
      fullExchangeName: suffixInfo.fullExchangeName
    };
  }
  
  return null;
}

/**
 * Centralized function to apply suffix-based exchange overrides to any data object
 * This ensures our suffix mappings ALWAYS take precedence over external API data
 */
export function applySuffixOverride(symbol: string, dataObj: any): any {
  const suffixInfo = getExchangeInfoFromSuffix(symbol);
  
  if (suffixInfo) {
    // Force override exchange and currency with our suffix-based data
    return {
      ...dataObj,
      exchange: suffixInfo.exchange,
      currency: suffixInfo.currency,
      fullExchangeName: suffixInfo.fullExchangeName
    };
  }
  
  return dataObj;
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