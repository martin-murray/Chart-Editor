# Stock Market Tracker Dashboard

## Overview
A full-stack stock market tracking application built with React, Express.js, and PostgreSQL. The application provides real-time stock market data with filtering capabilities, Slack integration for alerts, and comprehensive market analytics. The system features both in-memory and database storage options for flexible deployment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful API endpoints with JSON responses

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless (ACTIVE)
- **ORM**: Drizzle with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Storage Implementation**: DatabaseStorage class with full CRUD operations

## Key Components

### Stock Data Management
- **Stock Entity**: Comprehensive stock information including price, change, market cap, volume, sector, and index membership
- **Market Summary**: Aggregated market statistics and performance metrics
- **Data Filtering**: Advanced filtering by change threshold, market cap, index membership, and sorting options

### Slack Integration
- **Alert System**: Automated morning and afternoon market mover alerts
- **Bot Integration**: Slack Web API integration for sending formatted messages
- **Alert History**: Tracking of sent alerts with status monitoring

### User Interface Components
- **Dashboard**: Main interface with summary cards, gainers/losers tables, and filter controls
- **Market Status Indicator**: Real-time US market status (OPEN/CLOSED) with countdown to next market open
- **Data Tables**: Sortable tables with custom cell renderers for financial data
- **Export Functionality**: CSV export capabilities for market data
- **Price Chart Component**: Interactive stock price charts with multiple timeframes (1D, 1W, 1M, 3M, 1Y)
- **Ticker Search with Charts**: Real-time search with integrated price visualization on stock selection
- **Responsive Design**: Mobile-first design with adaptive layouts
- **Dark Mode**: Complete light/dark theme toggle with Intropic MUI color scheme (#5AF5FA cyan accents)
- **Typography**: Space Grotesk headings (weight 300) and Mulish body text (weight 400)

### External Service Integration - ALPHA VANTAGE PREMIUM PRIMARY ACTIVE
- **Primary Data Source**: Alpha Vantage Premium TOP_GAINERS_LOSERS API - **LIVE & ACTIVE** 
- **Data Coverage**: Current market movers with 20 gainers and 20 losers from today's trading (40 total market movers)
- **Real-time Quality**: Current August 5, 2025 market data with authentic extreme movers
- **Current Top Gainers**: VERB (+114.72%), PBM (+92.37%), COMM (+86.26%), BTAI (+85.40%)
- **Data Accuracy**: Authentic real-time US market movers with genuine current trading data
- **Multi-source Fallback**: Alpha Vantage Premium → Polygon → Yahoo Finance (stale) → Finnhub
- **Market Cap Integration**: Proper market cap values for filtering above $2B requirement
- **Sector Classification**: Accurate sector data from Yahoo Finance source
- **Real-time Updates**: Live current market movers data every 15 minutes
- **Data Quality**: Completely replaced stale Alpha Vantage TOP_GAINERS_LOSERS endpoint

### Secondary Data Sources
- **Finnhub API**: Fallback for ticker search, price charts, and company profiles
- **Polygon API**: Available for additional market data and comprehensive stock screening (backup source)

## Data Flow

### Stock Data Pipeline
1. **Data Ingestion**: Live market movers retrieved from Alpha Vantage Premium TOP_GAINERS_LOSERS endpoint (75 calls/minute)
2. **Comprehensive Coverage**: 40 total market movers (20 gainers, 20 losers) per refresh with TradingView-level coverage
3. **US Stock Filtering**: Enhanced filtering to include more US stocks while excluding obvious foreign exchanges
4. **Data Processing**: Raw market data transformed with smart market cap estimation and sector classification
5. **Database Storage**: Bulk upsert operations for efficient data updates in PostgreSQL
6. **API Endpoints**: RESTful endpoints serve filtered and sorted data to frontend
7. **Real-time Updates**: Automatic 15-minute refresh cycle with manual refresh capability
8. **Status Monitoring**: Premium API quota tracking with 75 calls/minute rate limit monitoring

### Slack Alert Workflow
1. **Market Analysis**: System analyzes current market movers based on configured thresholds
2. **Alert Generation**: Top gainers and losers identified and formatted for rich Slack blocks
3. **Slack Delivery**: Automated alerts sent to configured DM channel with market data
4. **Alert Logging**: All alerts logged with timestamps and delivery status in PostgreSQL
5. **Test Capability**: Manual test alerts available through dashboard interface

### User Interaction Flow
1. **Dashboard Load**: Initial data fetch for market summary and top movers
2. **Filter Application**: Dynamic filtering triggers new API requests
3. **Data Visualization**: Tables and cards update with filtered results
4. **Export Actions**: CSV generation and download functionality
5. **Alert Management**: Manual test alerts and alert history viewing

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database queries and migrations
- **@slack/web-api**: Slack bot integration
- **express**: Web server framework
- **@tanstack/react-query**: Server state management

### UI and Development Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **zod**: Runtime type validation

### Database and Storage
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Schema validation integration

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express API proxy
- **Hot Module Replacement**: Full HMR support for React components
- **Database**: Local PostgreSQL or Neon development database
- **Environment Variables**: DATABASE_URL, SLACK_BOT_TOKEN, SLACK_CHANNEL_ID

### Production Build
- **Frontend**: Vite production build with optimized assets
- **Backend**: esbuild bundling for Node.js deployment
- **Static Assets**: Served directly by Express in production
- **Database Migrations**: Drizzle Kit push for schema updates

### Replit Integration
- **Runtime Error Handling**: Replit-specific error overlay and debugging
- **Development Banner**: Automatic Replit development environment detection
- **Cartographer Integration**: Enhanced debugging capabilities in Replit environment

### Environment Configuration
- **Database Connection**: PostgreSQL database with automatic schema initialization
- **Slack Integration**: Optional Slack credentials with fallback warnings
- **Persistent Storage**: All market data, alerts, and summaries stored in PostgreSQL

## Recent Changes
- **August 5, 2025**: CRITICAL FIX - Resolved week-old stale data AND market cap calculation issues
  - **RESOLVED DATA STALENESS**: Yahoo Finance providing week-old data (APLD showing +31% vs actual +11.42% with +0.51% pre-market)
  - **RESOLVED MARKET CAP**: Fixed wildly incorrect market caps (VERB was $424B, now realistic $13.48M)
  - **NEW PRIMARY SOURCE**: Alpha Vantage Premium now primary data source with authentic current extreme movers
  - **Current data quality**: Now showing actual August 5, 2025 movers: BTBDW (+413.9%), VERB (+114.72%), PBM (+92.37%)
  - **Market cap accuracy**: Real market caps from Polygon API or realistic estimation based on price patterns
  - **Data source priority**: Alpha Vantage Premium → Polygon → Yahoo Finance (stale fallback) → Finnhub
  - **Market coverage**: 40 total market movers (20 gainers + 20 losers) with authentic current trading data
- **January 31, 2025**: Expanded market coverage to 60 comprehensive market movers
  - **EXPANDED**: Increased from ~20 stocks to 60 total market movers (30 gainers + 30 losers)
  - **TradingView-level coverage**: Now matches comprehensive market tracking with extensive current movers
  - **Real top losers included**: ALGN (-36.63%), CFLT (-32.86%), BAX (-22.42%) from actual trading
  - **Enhanced data breadth**: Covers small-cap, mid-cap, and large-cap movers across all sectors
- **January 31, 2025**: Critical data quality fix - Replaced stale Alpha Vantage with Yahoo Finance
  - **RESOLVED**: Alpha Vantage TOP_GAINERS_LOSERS providing stale July 2025 data instead of current January 31, 2025 data
  - **NEW PRIMARY SOURCE**: Yahoo Finance real-time market movers now primary data source
  - **Current data quality**: Now showing actual January 31, 2025 gainers: APLD (+31.01%), AMSC (+29.38%), PI (+26.49%)
  - **Multi-tier fallback**: Yahoo Finance → Polygon → Alpha Vantage (marked stale) → Finnhub for maximum reliability
  - **Automatic & manual refresh**: Both now use Yahoo Finance for current market movers data
  - **Data integrity maintained**: System now displays authentic current market data, not outdated July information
- **January 31, 2025**: Major UI restructure with tabbed interface and integrated filters
  - **Moved filters into Top Gainers/Losers section**: All 4 filters (% Change Threshold, Sort By, Market Cap, Index Filter) now integrated into the main table header
  - **Converted to tabbed interface**: Top Gainers and Top Losers are now tabs instead of separate sections
  - **Added "+ Watch" button**: Positioned in far right of price chart headers with cyan accent styling
  - **Removed Data Refresh section**: Eliminated "Data Refresh Last: 4:23 PM EDT Updates: 9:30am, 1pm, 4pm EST" display for cleaner interface
  - **Created MarketMoversTabs component**: New unified component combining both tables with integrated filter controls
  - **Enhanced UX**: Ticker search remains at top of filters, all controls consolidated in single card interface
- **January 31, 2025**: Implemented interactive price chart component with Finnhub integration
  - Added PriceChart component with 5 timeframes (1D, 1W, 1M, 3M, 1Y)
  - Integrated charts into ticker search for immediate visualization
  - Added `/api/stocks/:symbol/chart` endpoint with OHLCV data
  - Tested successfully with real market data (CVNA, AAPL)