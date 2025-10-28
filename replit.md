# Stock Market Tracker Dashboard

## Overview
A full-stack stock market tracking application built with React, Express.js, and PostgreSQL. The application provides real-time stock market data with filtering capabilities, Slack integration for alerts, and comprehensive market analytics. The system features both in-memory and database storage options for flexible deployment, aiming to provide comprehensive global market coverage and real-time insights for investors.

## Recent Changes (October 28, 2025)
- **Mobile Responsive Chart Controls**: Enhanced mobile layout for price chart controls
  - **Timeframe Selector**: Displays dropdown on screens < 760px, button layout on 760px+
  - **Price/Compare Tabs**: Positioned next to timeframe dropdown on mobile for better space utilization
  - On mobile (< 760px): Timeframe dropdown and Price/Compare tabs appear side-by-side in a single row
  - On desktop (760px+): Timeframe buttons appear in their row, tabs appear in separate section below
  - Both mobile and desktop tab controls share the same state within a unified Tabs provider
  - Prevents tabs from being crushed or unusable on narrow screens
  - Includes all timeframes: 1D, 5D, 2W, 1M, 3M, 1Y, 3Y, 5Y, Custom

## Recent Changes (October 23, 2025)
- **Login Attempt Tracking System**: Implemented comprehensive login attempt tracking with:
  - Database schema for storing all login attempts (username, success/failure, IP address, user agent, timestamp)
  - **Geographical Location Tracking**: Added IP geolocation integration using ipapi.co API
    - Stores city, region, and country for each login attempt
    - 3-second timeout with AbortController to prevent hanging
    - Graceful degradation when geolocation unavailable (stores null, displays "Unknown")
    - Location displayed with MapPin icon in login history table
  - **Failure Reason Tracking**: Captures specific reasons for failed login attempts
    - Distinguishes between "Invalid username" and "Invalid password" errors
    - Displays failure reasons in amber color in login history table
    - Shows "-" for successful logins, "Unknown" for legacy attempts without reason data
  - Backend API endpoints: POST /api/login for authentication, GET /api/session for token validation, GET /api/login-attempts for viewing history
  - Session-based authentication using secure bearer tokens (24-hour expiration, automatic cleanup)
  - Protected API endpoints with authentication middleware
  - Admin page at /login-history displaying login attempt history with statistics including geographical location and failure reasons
  - Global 401 error handler that automatically logs out users when tokens expire
  - Token validation on protected routes to ensure session validity

## Recent Changes (October 17, 2025)
- **Chart Data Coverage Fix**: Added 1-day buffer to daily resolution timeframes (3M, 1Y, 3Y, 5Y) to ensure the most recent trading day's data is included, even if the trading day hasn't completed yet. This ensures users always see the latest available data including the current day.
- **Annotation Text Overflow Fix**: Added `overflow-hidden` and `break-words` styling to all annotation text boxes to prevent text from extending beyond box boundaries during display and export.
- **Measure Tool Display Fix**: Removed time labels from measure tool and added `whitespace-nowrap` to prevent price text from overlapping with date labels at the bottom of charts.
- **Tab Highlight Fix**: Removed padding from TabsList to ensure the blue active tab indicator fits perfectly within the tab container without overhanging.
- **Measure Tool Time Span**: Added time span display to measure annotations showing duration between measurement points (e.g., "5 days", "3 hours", "45 mins") positioned below the price range.
- **Cross-Browser Text Rendering Fix**: Fixed vertical/horizontal line annotation text truncation in Firefox and Safari by using explicit inline styles (word-break, overflow-wrap, min-width) instead of Tailwind classes for consistent cross-browser rendering.
- **Tooltip Date/Time Overlap Fix**: Fixed chart tooltip date/time text overlapping price values when wrapping to 2 lines by adding proper line-height, padding, and border separator between date and price sections.
- **Annotation Font Size Fix**: Reduced annotation text size from 12px to 10px and decreased padding/width for better chart scaling and readability.
- **Cross-Browser Background Fix**: Added explicit hex color (#3A3A3A) fallback backgrounds to dropdowns, modals, and date pickers for consistent rendering in Firefox and Safari where CSS variables may not apply properly.

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