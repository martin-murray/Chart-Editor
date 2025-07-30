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
- **Responsive Design**: Mobile-first design with adaptive layouts
- **Dark Mode**: Complete light/dark theme toggle with Intropic MUI color scheme (#5AF5FA cyan accents)
- **Typography**: Space Grotesk headings (weight 300) and Mulish body text (weight 400)

### External Service Integration - CLEAN SLATE
- **Stock Data Source**: NO API CONFIGURED - ready for new integration
- **API Endpoints**: All external API services removed completely
- **Market Cap Validation**: All filtering logic removed - clean slate
- **Data Quality**: Ready for new authentic data source integration
- **US Stock Filtering**: Removed - ready for new filtering implementation
- **Previous APIs**: Alpha Vantage, Polygon.io, Alpaca Markets, IEX Cloud - **ALL REMOVED**
- **Messaging Integration**: Slack API completely removed - ready for new service
- **Real-time Updates**: Framework ready - no active data source
- **API Performance**: No active APIs - completely clean codebase

## Data Flow

### Stock Data Pipeline
1. **Data Ingestion**: Live market movers retrieved from Alpha Vantage TOP_GAINERS_LOSERS endpoint
2. **US Stock Filtering**: Comprehensive filtering to exclude foreign exchanges and non-US tickers
3. **Data Processing**: Raw market data transformed and enriched with sector and index information
4. **Database Storage**: Bulk upsert operations for efficient data updates in PostgreSQL
5. **API Endpoints**: RESTful endpoints serve filtered and sorted data to frontend
6. **Real-time Updates**: Automatic 15-minute refresh cycle with manual refresh capability
7. **Status Monitoring**: Live API quota tracking and refresh status indicators

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