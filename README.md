# Chart Editor

A professional, full-stack web application for creating and analyzing financial charts with real-time market data, interactive annotations, and AI-powered chart generation.

## Overview

Chart Editor is a comprehensive financial charting platform that enables users to create professional, data-driven visualizations for stocks, ETFs, and indices from global markets. The application provides three main pathways for chart creation and analysis, each optimized for different use cases.

## Features

### 📈 Price Chart
- **Global Stock Search**: Search and visualize stocks from major exchanges worldwide (NYSE, NASDAQ, LSE, Euronext, XETRA, TSE, HKEX, NSE, and more)
- **Interactive Annotations**: Add vertical lines, horizontal lines, text notes, and percentage measurements to charts
- **Multiple Timeframes**: View data from 1 day to 3 years with customizable date ranges
- **Y-Axis Toggle**: Switch between price and percentage view modes
- **Chart History**: Save and restore chart configurations with annotations
- **Export Options**: Download charts as PNG, PDF, or SVG
- **Real-time Data**: Live market data via Finnhub API integration

### 📊 Comparison Chart
- **Multi-Ticker Comparison**: Compare multiple stocks or ETFs side-by-side
- **Performance Analysis**: Uncover trends, correlations, and outliers across markets
- **Annotation Tools**: Add annotations to comparison charts
- **Chart Types**: Line and mountain chart visualizations
- **Save & Restore**: Save comparison chart configurations for later use

### 🤖 AI Co-Pilot
- **AI-Powered Chart Generation**: Create bespoke charts using natural language prompts
- **CSV Data Upload**: Upload your own data and let AI generate visualizations
- **Brand Styling**: Automatically styled with Intropic brand colors
- **High-Resolution Export**: Export charts ready for reports and presentations
- **Chart History**: View and manage all AI-generated charts

### 🌐 Global Market Coverage
- **69+ Global Exchanges**: Support for major stock exchanges worldwide
- **Stock Ticker Suffix Guide**: Searchable guide for Bloomberg-style ticker suffixes with market hours and holiday information
- **Market Status**: Real-time market status indicators with countdown timers
- **Market Holidays**: Upcoming market holidays for each exchange

### 🎨 User Experience
- **Dark Mode**: Complete light/dark theme toggle
- **Responsive Design**: Mobile-first design with adaptive layouts
- **Intuitive Navigation**: Chart type dropdown for easy switching between tools
- **Walkthrough Guide**: Interactive product walkthrough for new users

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Recharts** for chart visualization
- **Radix UI** components
- **Tailwind CSS** for styling
- **Wouter** for routing
- **TanStack Query** for data fetching

### Backend
- **Node.js** with **Express.js**
- **TypeScript** with ES modules
- **PostgreSQL** database (Neon serverless)
- **Drizzle ORM** for database operations
- **Express Sessions** for authentication
- **WebSocket** support for real-time features

### APIs & Services
- **Finnhub API** for stock market data
- **OpenAI API** for AI Co-Pilot features
- **GitHub API** for repository management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (recommended: [Neon.tech](https://neon.tech) for free serverless PostgreSQL)
- Finnhub API key ([Get one here](https://finnhub.io/register))
- OpenAI API key (optional, for AI Co-Pilot features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/martin-murray/Chart-Editor.git
   cd Chart-Editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://user:password@host:5432/database
   
   # Finnhub API Key for stock data
   FINNHUB_API_KEY=your_finnhub_api_key_here
   
   # OpenAI API Key (optional, for AI Co-Pilot)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Server Port (default: 5000)
   PORT=8080
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:8080` (or the port specified in your `.env` file)

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Project Structure

```
Chart-Editor/
├── client/                 # React frontend application
│   └── src/
│       ├── components/     # React components
│       ├── pages/         # Page components
│       ├── contexts/      # React contexts
│       └── data/          # Static data files
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── db.ts              # Database configuration
│   └── services/          # Business logic services
├── shared/                # Shared TypeScript types and schemas
│   └── schema.ts          # Database schema definitions
└── package.json           # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check TypeScript code
- `npm run db:push` - Push database schema changes

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FINNHUB_API_KEY` | Yes | Finnhub API key for stock data |
| `OPENAI_API_KEY` | No | OpenAI API key for AI Co-Pilot features |
| `PORT` | No | Server port (default: 5000) |

## Key Features in Detail

### Stock Ticker Suffix Guide
The application includes a comprehensive guide for Bloomberg-style ticker suffixes used across global exchanges. Search by suffix (e.g., `.UW`, `.SE`, `.MC`) to learn about:
- Exchange information
- Market hours
- Currency
- Upcoming market holidays

### Chart Annotations
- **Vertical Lines**: Mark specific time points
- **Horizontal Lines**: Mark price/percentage levels (draggable)
- **Text Notes**: Add contextual notes at specific points
- **Percentage Measurements**: Measure price changes between two points
- **Per-Ticker Memory**: Annotations are saved per ticker symbol

### Chart History
- Save chart configurations with all annotations
- Restore saved charts with one click
- Sort by newest or oldest
- Delete individual or all saved charts

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

AGPL-3.0 License - see [LICENSE](LICENSE) file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for professional financial data visualization**
