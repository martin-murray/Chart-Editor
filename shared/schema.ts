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

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
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

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const chartHistory = pgTable("chart_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // User identifier (email/username)
  sessionId: text("session_id").notNull(), // Unique session identifier for this chart
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(), // '1D', '5D', '2W', '1M', '3M', '1Y', '3Y', '5Y', 'custom'
  customStartDate: text("custom_start_date"), // For custom timeframe
  customEndDate: text("custom_end_date"), // For custom timeframe
  dividendAdjusted: boolean("dividend_adjusted").notNull().default(false),
  csvOverlay: jsonb("csv_overlay").$type<Array<{
    timestamp: number;
    value: number;
  }>>(),
  annotations: jsonb("annotations").$type<Array<{
    id: string;
    type: string;
    text?: string;
    price?: number;
    timestamp?: number;
    time?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    startPrice?: number;
    endPrice?: number;
  }>>().notNull(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChartHistorySchema = createInsertSchema(chartHistory).omit({
  id: true,
  savedAt: true,
  updatedAt: true,
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type SlackAlert = typeof slackAlerts.$inferSelect;
export type InsertSlackAlert = z.infer<typeof insertSlackAlertSchema>;
export type MarketSummary = typeof marketSummary.$inferSelect;
export type InsertMarketSummary = z.infer<typeof insertMarketSummarySchema>;
export type VisitorAnalytics = typeof visitorAnalytics.$inferSelect;
export type InsertVisitorAnalytics = z.infer<typeof insertVisitorAnalyticsSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type ChartHistory = typeof chartHistory.$inferSelect;
export type InsertChartHistory = z.infer<typeof insertChartHistorySchema>;

// AI Co-Pilot tables
export const aiCopilotChats = pgTable("ai_copilot_chats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // User identifier for ownership verification
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiCopilotMessages = pgTable("ai_copilot_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => aiCopilotChats.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  chartConfig: jsonb("chart_config").$type<{
    type: 'bar' | 'line' | 'pie' | 'area';
    data: any[];
    xKey: string;
    yKeys: string[];
    title: string;
    colors: string[];
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiCopilotUploads = pgTable("ai_copilot_uploads", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => aiCopilotChats.id),
  filename: text("filename").notNull(),
  csvData: text("csv_data").notNull(), // Store raw CSV as text
  parsedData: jsonb("parsed_data").$type<any[]>(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertAiCopilotChatSchema = createInsertSchema(aiCopilotChats).omit({
  id: true,
  createdAt: true,
});

export const insertAiCopilotMessageSchema = createInsertSchema(aiCopilotMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiCopilotUploadSchema = createInsertSchema(aiCopilotUploads).omit({
  id: true,
  uploadedAt: true,
});

export type AiCopilotChat = typeof aiCopilotChats.$inferSelect;
export type InsertAiCopilotChat = z.infer<typeof insertAiCopilotChatSchema>;
export type AiCopilotMessage = typeof aiCopilotMessages.$inferSelect;
export type InsertAiCopilotMessage = z.infer<typeof insertAiCopilotMessageSchema>;
export type AiCopilotUpload = typeof aiCopilotUploads.$inferSelect;
export type InsertAiCopilotUpload = z.infer<typeof insertAiCopilotUploadSchema>;

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
