// Bloomberg-style ticker suffix mappings
// This will be the data source for the suffix search tool

import { MarketHours } from '@/lib/marketHours';

export interface SuffixInfo {
  suffix: string;
  country: string;
  exchange: string;
  fullExchangeName: string;
  notes?: string;
  currency?: string;
  marketHours?: MarketHours;
}

export const suffixMappings: Record<string, SuffixInfo> = {
  // United States
  ".UW": {
    suffix: ".UW",
    country: "United States",
    exchange: "NASDAQ Global Select Market",
    fullExchangeName: "NASDAQ Global Select Market",
    currency: "USD",
    notes: "Top tier of NASDAQ for large-cap companies with the most stringent listing requirements",
    marketHours: {
      timezone: "America/New_York",
      sessions: [{ open: "09:30", close: "16:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".UF": {
    suffix: ".UF",
    country: "United States",
    exchange: "NASDAQ Global Market",
    fullExchangeName: "NASDAQ Global Market",
    currency: "USD",
    notes: "Middle tier of NASDAQ for mid-cap companies with strict financial and liquidity requirements",
    marketHours: {
      timezone: "America/New_York",
      sessions: [{ open: "09:30", close: "16:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".UQ": {
    suffix: ".UQ",
    country: "United States", 
    exchange: "NASDAQ Capital Market",
    fullExchangeName: "NASDAQ Capital Market",
    currency: "USD",
    notes: "NASDAQ Capital Market for smaller companies with less stringent listing requirements"
  },
  ".UN": {
    suffix: ".UN",
    country: "United States",
    exchange: "NYSE",
    fullExchangeName: "New York Stock Exchange",
    currency: "USD",
    notes: "NYSE-listed securities in Bloomberg terminal notation",
    marketHours: {
      timezone: "America/New_York",
      sessions: [{ open: "09:30", close: "16:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },

  // Europe
  ".SE": {
    suffix: ".SE",
    country: "Sweden",
    exchange: "OMX Stockholm",
    fullExchangeName: "Nasdaq Stockholm (OMX Stockholm)",
    currency: "SEK",
    notes: "Swedish stocks listed on Nasdaq Stockholm",
    marketHours: {
      timezone: "Europe/Stockholm",
      sessions: [{ open: "09:00", close: "17:30" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".MC": {
    suffix: ".MC",
    country: "Spain", 
    exchange: "BME",
    fullExchangeName: "Bolsas y Mercados Españoles (Madrid Stock Exchange)",
    currency: "EUR",
    notes: "Spanish stocks listed on the Madrid Stock Exchange",
    marketHours: {
      timezone: "Europe/Madrid",
      sessions: [{ open: "09:00", close: "17:30" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".PA": {
    suffix: ".PA",
    country: "France",
    exchange: "Euronext Paris",
    fullExchangeName: "Euronext Paris",
    currency: "EUR",
    notes: "French stocks listed on Euronext Paris",
    marketHours: {
      timezone: "Europe/Paris",
      sessions: [{ open: "09:00", close: "17:30" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".DE": {
    suffix: ".DE",
    country: "Germany",
    exchange: "XETRA",
    fullExchangeName: "Deutsche Börse XETRA",
    currency: "EUR",
    notes: "German stocks listed on XETRA electronic trading system"
  },
  ".L": {
    suffix: ".L",
    country: "United Kingdom",
    exchange: "LSE",
    fullExchangeName: "London Stock Exchange",
    currency: "GBP",
    notes: "UK stocks listed on the London Stock Exchange",
    marketHours: {
      timezone: "Europe/London",
      sessions: [{ open: "08:00", close: "16:30" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".AS": {
    suffix: ".AS",
    country: "Netherlands",
    exchange: "Euronext Amsterdam", 
    fullExchangeName: "Euronext Amsterdam",
    currency: "EUR",
    notes: "Dutch stocks listed on Euronext Amsterdam"
  },
  ".SW": {
    suffix: ".SW",
    country: "Switzerland",
    exchange: "SIX",
    fullExchangeName: "SIX Swiss Exchange",
    currency: "CHF",
    notes: "Swiss stocks listed on SIX Swiss Exchange"
  },
  ".MI": {
    suffix: ".MI",
    country: "Italy",
    exchange: "Borsa Italiana",
    fullExchangeName: "Borsa Italiana (Milan Stock Exchange)",
    currency: "EUR",
    notes: "Italian stocks listed on Borsa Italiana"
  },

  // Asia Pacific
  ".T": {
    suffix: ".T",
    country: "Japan",
    exchange: "TSE",
    fullExchangeName: "Tokyo Stock Exchange",
    currency: "JPY",
    notes: "Japanese stocks listed on the Tokyo Stock Exchange",
    marketHours: {
      timezone: "Asia/Tokyo",
      sessions: [
        { open: "09:00", close: "11:30" },
        { open: "12:30", close: "15:00" }
      ],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".HK": {
    suffix: ".HK",
    country: "Hong Kong",
    exchange: "HKEX",
    fullExchangeName: "Hong Kong Exchanges and Clearing",
    currency: "HKD",
    notes: "Hong Kong stocks listed on HKEX",
    marketHours: {
      timezone: "Asia/Hong_Kong",
      sessions: [
        { open: "09:30", close: "12:00" },
        { open: "13:00", close: "16:00" }
      ],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".SS": {
    suffix: ".SS",
    country: "China",
    exchange: "SSE",
    fullExchangeName: "Shanghai Stock Exchange",
    currency: "CNY",
    notes: "Chinese A-shares listed on Shanghai Stock Exchange"
  },
  ".SZ": {
    suffix: ".SZ", 
    country: "China",
    exchange: "SZSE",
    fullExchangeName: "Shenzhen Stock Exchange",
    currency: "CNY",
    notes: "Chinese A-shares listed on Shenzhen Stock Exchange"
  },
  ".AX": {
    suffix: ".AX",
    country: "Australia",
    exchange: "ASX",
    fullExchangeName: "Australian Securities Exchange", 
    currency: "AUD",
    notes: "Australian stocks listed on the ASX",
    marketHours: {
      timezone: "Australia/Sydney",
      sessions: [{ open: "10:00", close: "16:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".KS": {
    suffix: ".KS",
    country: "South Korea",
    exchange: "KOSPI",
    fullExchangeName: "Korea Composite Stock Price Index",
    currency: "KRW",
    notes: "South Korean stocks listed on KOSPI"
  },

  // Canada
  ".TO": {
    suffix: ".TO",
    country: "Canada",
    exchange: "TSX",
    fullExchangeName: "Toronto Stock Exchange",
    currency: "CAD",
    notes: "Canadian stocks listed on the Toronto Stock Exchange",
    marketHours: {
      timezone: "America/Toronto",
      sessions: [{ open: "09:30", close: "16:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".V": {
    suffix: ".V",
    country: "Canada", 
    exchange: "TSXV",
    fullExchangeName: "TSX Venture Exchange",
    currency: "CAD",
    notes: "Canadian venture stocks listed on TSX Venture Exchange"
  },

  // Nordic
  ".NO": {
    suffix: ".NO",
    country: "Norway",
    exchange: "OSE",
    fullExchangeName: "Oslo Stock Exchange (Euronext Oslo)",
    currency: "NOK",
    notes: "Norwegian stocks listed on Oslo Stock Exchange"
  },
  ".CO": {
    suffix: ".CO",
    country: "Denmark",
    exchange: "OMXC",
    fullExchangeName: "Nasdaq Copenhagen (OMX Copenhagen)",
    currency: "DKK", 
    notes: "Danish stocks listed on Nasdaq Copenhagen"
  },
  ".HE": {
    suffix: ".HE",
    country: "Finland",
    exchange: "OMXH",
    fullExchangeName: "Nasdaq Helsinki (OMX Helsinki)",
    currency: "EUR",
    notes: "Finnish stocks listed on Nasdaq Helsinki"
  },

  // Latin America
  ".MX": {
    suffix: ".MX",
    country: "Mexico",
    exchange: "BMV",
    fullExchangeName: "Bolsa Mexicana de Valores (Mexican Stock Exchange)",
    currency: "MXN",
    notes: "Mexican stocks listed on the Mexican Stock Exchange's Global Market",
    marketHours: {
      timezone: "America/Mexico_City",
      sessions: [{ open: "08:30", close: "15:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  ".SA": {
    suffix: ".SA",
    country: "Brazil",
    exchange: "B3",
    fullExchangeName: "B3 - Brasil Bolsa Balcão",
    currency: "BRL",
    notes: "Brazilian stocks listed on B3",
    marketHours: {
      timezone: "America/Sao_Paulo",
      sessions: [{ open: "10:00", close: "17:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },

  // Additional Asia Pacific
  ".SI": {
    suffix: ".SI",
    country: "Singapore",
    exchange: "SGX",
    fullExchangeName: "Singapore Exchange",
    currency: "SGD",
    notes: "Singapore stocks listed on SGX",
    marketHours: {
      timezone: "Asia/Singapore",
      sessions: [{ open: "09:00", close: "17:00" }],
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
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
    currency: "SAR",
    notes: "Saudi Arabian stocks"
  },
  ".BD": {
    suffix: ".BD",
    country: "Bangladesh",
    exchange: "Dhaka Stock Exchange",
    fullExchangeName: "Dhaka Stock Exchange",
    currency: "BDT",
    notes: "Bangladeshi stocks"
  },
  ".BU": {
    suffix: ".BU",
    country: "Bulgaria",
    exchange: "Bulgarian Stock Exchange",
    fullExchangeName: "Bulgarian Stock Exchange",
    currency: "BGN",
    notes: "Bulgarian stocks"
  },
  ".CR": {
    suffix: ".CR",
    country: "Costa Rica",
    exchange: "Costa Rica Stock Exchange",
    fullExchangeName: "Bolsa Nacional de Valores",
    currency: "CRC",
    notes: "Costa Rican stocks"
  },
  ".CY": {
    suffix: ".CY",
    country: "Cyprus",
    exchange: "Cyprus Stock Exchange",
    fullExchangeName: "Cyprus Stock Exchange",
    currency: "EUR",
    notes: "Cypriot stocks"
  },
  ".EC": {
    suffix: ".EC",
    country: "Egypt",
    exchange: "Egyptian Exchange",
    fullExchangeName: "Egyptian Exchange (EGX)",
    currency: "EGP",
    notes: "Egyptian stocks"
  },
  ".JR": {
    suffix: ".JR",
    country: "Jordan",
    exchange: "Amman Stock Exchange",
    fullExchangeName: "Amman Stock Exchange",
    currency: "JOD",
    notes: "Jordanian stocks"
  },
  ".JT": {
    suffix: ".JT",
    country: "Japan",
    exchange: "Tokyo Stock Exchange",
    fullExchangeName: "Tokyo Stock Exchange",
    currency: "JPY",
    notes: "Japanese stocks (alternative code)"
  },
  ".KH": {
    suffix: ".KH",
    country: "Cambodia",
    exchange: "Cambodia Securities Exchange",
    fullExchangeName: "Cambodia Securities Exchange",
    currency: "KHR",
    notes: "Cambodian stocks"
  },
  ".KK": {
    suffix: ".KK",
    country: "Kuwait",
    exchange: "Kuwait Stock Exchange",
    fullExchangeName: "Kuwait Stock Exchange (Boursa Kuwait)",
    currency: "KWD",
    notes: "Kuwaiti stocks"
  },
  ".KN": {
    suffix: ".KN",
    country: "Kenya",
    exchange: "Nairobi Securities Exchange",
    fullExchangeName: "Nairobi Securities Exchange",
    currency: "KES",
    notes: "Kenyan stocks"
  },
  ".KP": {
    suffix: ".KP",
    country: "South Korea",
    exchange: "Korea Exchange",
    fullExchangeName: "Korea Exchange (KRX)",
    currency: "KRW",
    notes: "South Korean stocks"
  },
  ".KQ": {
    suffix: ".KQ",
    country: "South Korea",
    exchange: "KOSDAQ",
    fullExchangeName: "Korea Exchange (KOSDAQ)",
    currency: "KRW",
    notes: "Korean KOSDAQ stocks"
  },
  ".KZ": {
    suffix: ".KZ",
    country: "Kazakhstan",
    exchange: "Kazakhstan Stock Exchange",
    fullExchangeName: "Kazakhstan Stock Exchange",
    currency: "KZT",
    notes: "Kazakhstani stocks"
  },
  ".LK": {
    suffix: ".LK",
    country: "Sri Lanka",
    exchange: "Colombo Stock Exchange",
    fullExchangeName: "Colombo Stock Exchange",
    currency: "LKR",
    notes: "Sri Lankan stocks"
  },
  ".MO": {
    suffix: ".MO",
    country: "Mongolia",
    exchange: "Mongolian Stock Exchange",
    fullExchangeName: "Mongolian Stock Exchange",
    currency: "MNT",
    notes: "Mongolian stocks"
  },
  ".PE": {
    suffix: ".PE",
    country: "Peru",
    exchange: "Lima Stock Exchange",
    fullExchangeName: "Bolsa de Valores de Lima",
    currency: "PEN",
    notes: "Peruvian stocks"
  },
  ".PH": {
    suffix: ".PH",
    country: "Philippines",
    exchange: "Philippine Stock Exchange",
    fullExchangeName: "Philippine Stock Exchange",
    currency: "PHP",
    notes: "Philippine stocks"
  },
  ".PK": {
    suffix: ".PK",
    country: "Pakistan",
    exchange: "Pakistan Stock Exchange",
    fullExchangeName: "Pakistan Stock Exchange",
    currency: "PKR",
    notes: "Pakistani stocks"
  },
  ".QA": {
    suffix: ".QA",
    country: "Qatar",
    exchange: "Qatar Stock Exchange",
    fullExchangeName: "Qatar Stock Exchange",
    currency: "QAR",
    notes: "Qatari stocks"
  },
  ".RO": {
    suffix: ".RO",
    country: "Romania",
    exchange: "Bucharest Stock Exchange",
    fullExchangeName: "Bucharest Stock Exchange",
    currency: "RON",
    notes: "Romanian stocks"
  },
  ".SK": {
    suffix: ".SK",
    country: "Slovakia",
    exchange: "Bratislava Stock Exchange",
    fullExchangeName: "Bratislava Stock Exchange",
    currency: "EUR",
    notes: "Slovakian stocks"
  },
  ".TU": {
    suffix: ".TU",
    country: "Tunisia",
    exchange: "Tunis Stock Exchange",
    fullExchangeName: "Bourse de Tunis",
    currency: "TND",
    notes: "Tunisian stocks"
  },
  ".UA": {
    suffix: ".UA",
    country: "Ukraine",
    exchange: "Ukrainian Exchange",
    fullExchangeName: "Ukrainian Exchange",
    currency: "UAH",
    notes: "Ukrainian stocks"
  },
  ".UY": {
    suffix: ".UY",
    country: "Uruguay",
    exchange: "Montevideo Stock Exchange",
    fullExchangeName: "Bolsa de Valores de Montevideo",
    currency: "UYU",
    notes: "Uruguayan stocks"
  },
  ".VB": {
    suffix: ".VB",
    country: "Bolivia",
    exchange: "Bolivian Stock Exchange",
    fullExchangeName: "Bolsa Boliviana de Valores",
    currency: "BOB",
    notes: "Bolivian stocks"
  },
  ".VH": {
    suffix: ".VH",
    country: "Vietnam",
    exchange: "Hanoi Stock Exchange",
    fullExchangeName: "Hanoi Stock Exchange",
    currency: "VND",
    notes: "Vietnamese stocks (Hanoi)"
  },
  ".VM": {
    suffix: ".VM",
    country: "Vietnam",
    exchange: "Ho Chi Minh Stock Exchange",
    fullExchangeName: "Ho Chi Minh Stock Exchange",
    currency: "VND",
    notes: "Vietnamese stocks (HCMC)"
  },
  ".ZH": {
    suffix: ".ZH",
    country: "Zimbabwe",
    exchange: "Zimbabwe Stock Exchange",
    fullExchangeName: "Zimbabwe Stock Exchange",
    currency: "ZWL",
    notes: "Zimbabwean stocks"
  },
  ".ZL": {
    suffix: ".ZL",
    country: "Zambia",
    exchange: "Lusaka Stock Exchange",
    fullExchangeName: "Lusaka Stock Exchange",
    currency: "ZMW",
    notes: "Zambian stocks"
  }
};

// Helper function to search suffixes
export const searchSuffix = (query: string): SuffixInfo | null => {
  const cleanQuery = query.trim().toUpperCase();
  
  // Add leading dot if not present
  const searchKey = cleanQuery.startsWith('.') ? cleanQuery : `.${cleanQuery}`;
  
  return suffixMappings[searchKey] || null;
};

// Get all available suffixes for autocomplete/suggestions
export const getAllSuffixes = (): string[] => {
  return Object.keys(suffixMappings).sort();
};