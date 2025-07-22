import { WebClient, type ChatPostMessageArguments } from "@slack/web-api";
import { type Stock } from "@shared/schema";

if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("SLACK_BOT_TOKEN environment variable not set. Slack functionality will be limited.");
}

if (!process.env.SLACK_CHANNEL_ID) {
  console.warn("SLACK_CHANNEL_ID environment variable not set. Using default channel.");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export class SlackService {
  private channelId: string;

  constructor() {
    this.channelId = process.env.SLACK_CHANNEL_ID || "#research-team";
  }

  async sendMarketMoversAlert(
    gainers: Stock[],
    losers: Stock[],
    type: "morning" | "afternoon" | "test" = "test"
  ): Promise<string | undefined> {
    try {
      const timeLabel = type === "morning" ? "Morning" : type === "afternoon" ? "Afternoon" : "Test";
      const emoji = type === "test" ? ":test_tube:" : ":chart_with_upwards_trend:";
      
      const message: ChatPostMessageArguments = {
        channel: this.channelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${emoji} ${timeLabel} Market Movers Alert`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Updated ${new Date().toLocaleTimeString('en-US', { 
                  timeZone: 'America/New_York',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":arrow_up: *Top 5 Gainers*"
            }
          },
          {
            type: "rich_text",
            elements: [
              {
                type: "rich_text_list",
                style: "ordered",
                elements: gainers.slice(0, 5).map(stock => ({
                  type: "rich_text_section" as const,
                  elements: [
                    {
                      type: "text" as const,
                      text: `${stock.symbol} (${stock.name}): ${stock.price} `
                    },
                    {
                      type: "text" as const,
                      text: `+${stock.percentChange}%`,
                      style: {
                        bold: true
                      }
                    },
                    {
                      type: "text" as const,
                      text: ` | ${stock.marketCap}`
                    }
                  ]
                }))
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":arrow_down: *Top 5 Losers*"
            }
          },
          {
            type: "rich_text",
            elements: [
              {
                type: "rich_text_list",
                style: "ordered",
                elements: losers.slice(0, 5).map(stock => ({
                  type: "rich_text_section" as const,
                  elements: [
                    {
                      type: "text" as const,
                      text: `${stock.symbol} (${stock.name}): ${stock.price} `
                    },
                    {
                      type: "text" as const,
                      text: `${stock.percentChange}%`,
                      style: {
                        bold: true
                      }
                    },
                    {
                      type: "text" as const,
                      text: ` | ${stock.marketCap}`
                    }
                  ]
                }))
              }
            ]
          },
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `:information_source: *Total Movers:* ${gainers.length + losers.length} stocks (≥$2B market cap) | *Avg Gainer:* +${this.calculateAverage(gainers)}% | *Avg Loser:* ${this.calculateAverage(losers)}%`
              }
            ]
          }
        ]
      };

      const response = await slack.chat.postMessage(message);
      return response.ts;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      throw error;
    }
  }

  async sendVolatilityAlert(stock: Stock): Promise<string | undefined> {
    try {
      const message: ChatPostMessageArguments = {
        channel: this.channelId,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:warning: *Volatility Alert*\n\n*${stock.symbol}* (${stock.name}) is showing unusual activity:\n• Price: $${stock.price}\n• Change: ${stock.percentChange}%\n• Volume: ${stock.volume.toLocaleString()}\n• Market Cap: ${stock.marketCap}`
            }
          }
        ]
      };

      const response = await slack.chat.postMessage(message);
      return response.ts;
    } catch (error) {
      console.error('Error sending volatility alert:', error);
      throw error;
    }
  }

  private calculateAverage(stocks: Stock[]): string {
    if (stocks.length === 0) return "0.00";
    const sum = stocks.reduce((acc, stock) => acc + parseFloat(stock.percentChange), 0);
    return (sum / stocks.length).toFixed(2);
  }
}

export const slackService = new SlackService();
