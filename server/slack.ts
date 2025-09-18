// Slack integration for feedback submissions
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface FeedbackParams {
  name: string;
  email: string;
  message: string;
  file?: {
    content: Buffer;
    filename: string;
    mimetype: string;
  };
}

export async function sendFeedbackToSlack(params: FeedbackParams, channelId?: string): Promise<boolean> {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      console.error('SLACK_BOT_TOKEN environment variable is not set');
      return false;
    }

    // Use environment channel ID or fallback to general
    const targetChannel = channelId || process.env.SLACK_CHANNEL_ID || 'general';

    // Create the message blocks for rich formatting
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📝 New Feedback - Intropic Chart Editor'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Name:*\n${params.name}`
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n${params.email}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n${params.message}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Submitted from charteditor.app • ${new Date().toLocaleString()}`
          }
        ]
      }
    ];

    // Send the main message
    const result = await slack.chat.postMessage({
      channel: targetChannel,
      blocks: blocks,
      text: `New feedback from ${params.name} (${params.email})` // Fallback text for notifications
    });

    // If there's a file attachment, upload it as a separate message
    if (params.file && result.ts) {
      try {
        await slack.files.uploadV2({
          channel_id: targetChannel,
          file: params.file.content,
          filename: params.file.filename,
          title: `Attachment from ${params.name}`,
          thread_ts: result.ts // Upload as a thread reply
        });
        console.log(`📎 File attachment uploaded: ${params.file.filename}`);
      } catch (fileError) {
        console.error('Error uploading file to Slack:', fileError);
        // Don't fail the entire operation if file upload fails
      }
    }

    console.log(`✅ Feedback sent to Slack channel ${targetChannel} from ${params.email}`);
    return true;

  } catch (error) {
    console.error('Slack feedback error:', error);
    return false;
  }
}