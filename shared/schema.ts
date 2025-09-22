import { pgTable, text, serial, decimal, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  change: text("change").notNull(),
  percentChange: text("percent_change").notNull(),
  marketCap: text("market_cap").notNull(),
  marketCapValue: text("market_cap_value").notNull(),
  volume: integer("volume").notNull(),
  indices: jsonb("indices").$type<string[]>().notNull(),
  sector: text("sector").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const slackAlerts = pgTable("slack_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'morning', 'afternoon', 'test'
  title: text("title").notNull(),
  description: text("description").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // 'sent', 'failed'
});

export const marketSummary = pgTable("market_summary", {
  id: serial("id").primaryKey(),
  totalMovers: integer("total_movers").notNull(),
  totalGainers: integer("total_gainers").notNull(),
  totalLosers: integer("total_losers").notNull(),
  totalMarketCap: text("total_market_cap").notNull(),
  avgGainerChange: text("avg_gainer_change").notNull(),
  avgLoserChange: text("avg_loser_change").notNull(),
  avgVolume: text("avg_volume").notNull(),
  volatility: text("volatility").notNull(),
  sectorLeader: text("sector_leader").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const visitorAnalytics = pgTable("visitor_analytics", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  timezone: text("timezone"),
  isp: text("isp"),
  org: text("org"),
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  duration: integer("duration"), // Duration in seconds
  returnVisits: integer("return_visits").default(1),
  sessionId: text("session_id"),
  path: text("path").notNull().default("/"),
});

export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true,
});

export const insertSlackAlertSchema = createInsertSchema(slackAlerts).omit({
  id: true,
  sentAt: true,
});

export const insertMarketSummarySchema = createInsertSchema(marketSummary).omit({
  id: true,
  lastUpdated: true,
});

export const insertVisitorAnalyticsSchema = createInsertSchema(visitorAnalytics).omit({
  id: true,
  visitedAt: true,
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type SlackAlert = typeof slackAlerts.$inferSelect;
export type InsertSlackAlert = z.infer<typeof insertSlackAlertSchema>;
export type MarketSummary = typeof marketSummary.$inferSelect;
export type InsertMarketSummary = z.infer<typeof insertMarketSummarySchema>;
export type VisitorAnalytics = typeof visitorAnalytics.$inferSelect;
export type InsertVisitorAnalytics = z.infer<typeof insertVisitorAnalyticsSchema>;

// Filter schemas
export const stockFilterSchema = z.object({
  changeThreshold: z.number().min(0).default(2),
  marketCap: z.enum(["2B", "5B", "10B", "50B"]).default("2B"),
  indexFilter: z.enum([
    "all",
    "sp500",
    "sp400", 
    "sp600",
    "nasdaq100",
    "russell1000",
    "russell2000",
    "russell3000",
    "tmi"
  ]).default("all"),
  sortBy: z.enum(["symbol", "price", "change", "percentChange", "marketCap", "marketCapValue", "volume"]).default("percentChange"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  ticker: z.string().optional(), // For ticker search
});

// Search result schema
export const searchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.string(),
  percentChange: z.string(),
  marketCap: z.string(),
});

export type StockFilter = z.infer<typeof stockFilterSchema>;
