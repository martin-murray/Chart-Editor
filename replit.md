# Stock Market Tracker Dashboard

### Overview
A full-stack stock market tracking application providing real-time stock market data, comprehensive analytics, and Slack integration for alerts. The system aims to offer extensive global market coverage and actionable insights for investors, supporting both in-memory and database storage.

### User Preferences
Preferred communication style: Simple, everyday language.
Testing preference: User prefers to handle testing themselves rather than internal automated testing. Skip QA testing for speed - user will test the app directly.

### System Architecture

#### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **UI/UX Decisions**:
    - **Dark Mode**: Complete light/dark theme toggle with Intropic MUI color scheme (#5AF5FA cyan accents)
    - **Typography**: Space Grotesk Light (300) for H1/H2; Mulish for H3, H4+, and body text
    - **Responsive Design**: Mobile-first design with adaptive layouts
    - **Dashboard**: Main interface with summary cards, gainers/losers tables, and filter controls
    - **Market Status Indicator**: Real-time US market status (OPEN/CLOSED) with countdown
    - **Data Tables**: Sortable tables with custom cell renderers
    - **Export Functionality**: CSV export for market data
    - **Price Chart Component**: Interactive stock price charts with multiple timeframes and integrated ticker search
    - **Stock Ticker Suffix Guide**: Searchable guide for global stock exchange suffixes with market hours and holiday information
    - **Homepage**: Three interactive pathway cards for Price Chart, Comparison Chart, and AI Co-Pilot.
    - **Navigation**: Global navigation dropdown for quick chart type switching.
    - **Delete Confirmation UX Pattern**: Two-click confirmation for all delete actions: bin icon slides to reveal "Delete Now" (cyan #5AF5FA), second click initiates animated deletion (card slides left and fades out). Auto-resets after 4 seconds.

#### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`
- **API Design**: RESTful API endpoints with JSON responses

#### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle with schema-first approach and Drizzle Kit for migrations
- **Storage Implementation**: `DatabaseStorage` class for CRUD operations

#### Key Features
- **Stock Data Management**: Comprehensive stock information, market summary, and advanced filtering.
- **Slack Integration**: Automated morning/afternoon market mover alerts with bot integration.
- **Global Exchange Coverage**: Supports 69 global stock exchanges with Bloomberg-style ticker suffixes, currency mapping, and Finnhub API integration for live market holiday data.
- **Stock Data Pipeline**: Data ingestion from Alpha Vantage Premium, coverage of 40 market movers, US stock filtering, smart market cap estimation, sector classification, efficient database storage, RESTful API endpoints, 15-minute refresh cycle, and API quota tracking.
- **Login Attempt Tracking System**: Comprehensive tracking of login attempts including geographical location (via ipapi.co), success/failure status, and specific failure reasons. Admin page displays history and statistics.
- **Comparison Chart Enhancement**: Forward-fill logic for global market comparisons to create continuous lines across different market hours.
- **CSV Overlay Feature**: Allows users to upload or paste CSV data for percentage overlays on charts, with strict validation and visual rendering.
- **Y-Axis Toggle Feature**: In price chart, switch between price and percentage display modes.
- **Annotation Font Size Control**: Price Chart annotation edit dialogs include font size controls (−/+ buttons) with real-time preview. Sizes range from 10px to 32px in 2px increments, default 14px. Font size is persisted per annotation.

### External Dependencies

#### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database queries and migrations
- **@slack/web-api**: Slack bot integration
- **express**: Web server framework
- **@tanstack/react-query**: Server state management
- **Alpha Vantage Premium**: Primary data source for TOP_GAINERS_LOSERS API (live market movers).
- **Finnhub API**: Fallback for ticker search, price charts, company profiles, and real-time market holidays.
- **Polygon API**: Backup source for additional market data and comprehensive stock screening.
- **ipapi.co**: IP geolocation for login attempt tracking.
- **OpenAI**: AI Copilot chart maker integration (via Replit AI Integrations).

#### UI and Development Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **vite**: Build tool and development server
- **typescript**: Type safety
- **zod**: Runtime type validation

#### Database and Storage
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Schema validation integration