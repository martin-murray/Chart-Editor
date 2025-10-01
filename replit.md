# Stock Market Tracker Dashboard

## Overview
A full-stack stock market tracking application built with React, Express.js, and PostgreSQL. The application provides real-time stock market data with filtering capabilities, Slack integration for alerts, and comprehensive market analytics. The system features both in-memory and database storage options for flexible deployment, aiming to provide comprehensive global market coverage and real-time insights for investors.

## User Preferences
Preferred communication style: Simple, everyday language.
Testing preference: User prefers to handle testing themselves rather than internal automated testing. Skip QA testing for speed - user will test the app directly.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **UI/UX Decisions**:
    - **Dark Mode**: Complete light/dark theme toggle with Intropic MUI color scheme (#5AF5FA cyan accents)
    - **Typography**: Space Grotesk Light (300) for H1/H2; Mulish for H3, H4+, and body text (Light, Regular, Bold weights)
    - **Responsive Design**: Mobile-first design with adaptive layouts
    - **Dashboard**: Main interface with summary cards, gainers/losers tables, and filter controls
    - **Market Status Indicator**: Real-time US market status (OPEN/CLOSED) with countdown
    - **Data Tables**: Sortable tables with custom cell renderers
    - **Export Functionality**: CSV export for market data
    - **Price Chart Component**: Interactive stock price charts with multiple timeframes (1D, 1W, 1M, 3M, 1Y) and integrated ticker search
    - **Stock Ticker Suffix Guide**: Searchable guide for global stock exchange suffixes with market hours and holiday information

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`
- **API Design**: RESTful API endpoints with JSON responses

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle with schema-first approach and Drizzle Kit for migrations
- **Storage Implementation**: `DatabaseStorage` class for CRUD operations

### Key Features
- **Stock Data Management**: Comprehensive stock information, market summary, and advanced filtering by change threshold, market cap, index membership, and sorting.
- **Slack Integration**: Automated morning/afternoon market mover alerts with bot integration for sending formatted messages and alert history tracking.
- **Global Exchange Coverage**: Supports 69 global stock exchanges with Bloomberg-style ticker suffixes, comprehensive currency mapping, and Finnhub API integration for live market holiday data.
- **Stock Data Pipeline**: Data ingestion from Alpha Vantage Premium, comprehensive coverage of 40 market movers (20 gainers, 20 losers), US stock filtering, smart market cap estimation, sector classification, efficient database storage, RESTful API endpoints, 15-minute refresh cycle, and API quota tracking.
- **Slack Alert Workflow**: Market analysis, alert generation formatted for Slack blocks, automated delivery, and alert logging.

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database queries and migrations
- **@slack/web-api**: Slack bot integration
- **express**: Web server framework
- **@tanstack/react-query**: Server state management
- **Alpha Vantage Premium**: Primary data source for TOP_GAINERS_LOSERS API (live market movers, 20 gainers, 20 losers).
- **Finnhub API**: Fallback for ticker search, price charts, company profiles, and real-time market holidays.
- **Polygon API**: Backup source for additional market data and comprehensive stock screening.

### UI and Development Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **vite**: Build tool and development server
- **typescript**: Type safety
- **zod**: Runtime type validation

### Database and Storage
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Schema validation integration