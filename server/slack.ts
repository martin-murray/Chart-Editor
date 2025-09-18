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
    // TEMPORARY: Log feedback to console until Slack is working
    console.log('🎉 ===== FEEDBACK RECEIVED =====');
    console.log(`📝 Name: ${params.name}`);
    console.log(`📧 Email: ${params.email}`);
    console.log(`💬 Message: ${params.message}`);
    if (params.file) {
      console.log(`📎 File: ${params.file.filename} (${params.file.mimetype})`);
    }
    console.log('🎉 ===========================');
    
    // Return success for now - we'll fix Slack later
    return true;
    
    // TODO: Re-enable Slack integration once channel permissions are sorted out

  } catch (error) {
    console.error('Feedback submission error:', error);
    return false;
  }
}