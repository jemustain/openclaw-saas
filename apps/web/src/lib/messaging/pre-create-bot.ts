import { createTelegramBot } from './telegram-bot-factory';
import { createClient } from '../supabase/server';

/**
 * Pre-create a Telegram bot for a newly registered user.
 * Uses the service-role client so it works outside of request context.
 * Saves bot username + token to the users table.
 */
export async function preCreateTelegramBot(
  userId: string,
  displayName?: string,
): Promise<void> {
  // Check env vars are available
  const hasConfig = !!(
    process.env.TELEGRAM_API_ID &&
    process.env.TELEGRAM_API_HASH &&
    process.env.TELEGRAM_SESSION_STRING
  );
  if (!hasConfig) {
    console.log('Skipping Telegram bot pre-creation: env not configured');
    return;
  }

  const supabase: any = createClient();

  // Check if user already has a bot
  const { data: user } = await supabase
    .from('users')
    .select('telegram_bot_username, telegram_bot_token')
    .eq('id', userId)
    .single();

  if (user?.telegram_bot_token) {
    console.log(`User ${userId} already has a Telegram bot, skipping`);
    return;
  }

  const bot = await createTelegramBot(userId, displayName);

  await supabase
    .from('users')
    .update({
      telegram_bot_username: bot.botUsername,
      telegram_bot_token: bot.botToken,
    })
    .eq('id', userId);

  console.log(`Pre-created Telegram bot @${bot.botUsername} for user ${userId}`);
}
