import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

interface BotCreationResult {
  botUsername: string;
  botToken: string;
  botDisplayName: string;
}

// Config from env
const API_ID = parseInt((process.env.TELEGRAM_API_ID ?? '0').trim(), 10);
const API_HASH = (process.env.TELEGRAM_API_HASH ?? '').trim();
const SESSION_STRING = (process.env.TELEGRAM_SESSION_STRING ?? '').trim();

// Singleton client
let client: TelegramClient | null = null;

async function getClient(): Promise<TelegramClient> {
  if (client?.connected) return client;

  const session = new StringSession(SESSION_STRING);
  client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
  });

  await client.connect();
  return client;
}

/**
 * Create a new Telegram bot via BotFather automation.
 *
 * @param userId - Used to generate a unique bot username
 * @param displayName - What the bot shows as its name (e.g. "Julie's Assistant")
 */
export async function createTelegramBot(
  userId: string,
  displayName?: string,
): Promise<BotCreationResult> {
  const tg = await getClient();

  // Generate unique username with random suffix to avoid collisions
  const rand = Math.random().toString(36).slice(2, 8).toLowerCase();
  const botUsername = `sw_${rand}_bot`;
  const botName = displayName ?? 'ShiftWorker Assistant';

  // Send /newbot to BotFather
  const botFather = await tg.getEntity('BotFather');

  await tg.sendMessage(botFather, { message: '/newbot' });
  await sleep(1000);

  // Send the display name
  await tg.sendMessage(botFather, { message: botName });
  await sleep(1000);

  // Send the username
  await tg.sendMessage(botFather, { message: botUsername });
  await sleep(1500);

  // Read the response — BotFather sends back the token
  const messages = await tg.getMessages(botFather, { limit: 3 });

  // Find the message containing the token (format: 1234567890:ABCdef...)
  let botToken: string | null = null;
  for (const msg of messages) {
    const text = msg.text ?? '';
    const tokenMatch = text.match(/(\d+:[A-Za-z0-9_-]+)/);
    if (tokenMatch) {
      botToken = tokenMatch[1];
      break;
    }
  }

  if (!botToken) {
    // Check if username was taken — BotFather says "Sorry, this username is already taken"
    const lastMsg = messages[0]?.text ?? '';
    if (
      lastMsg.includes('already taken') ||
      lastMsg.includes('already been taken')
    ) {
      // The bot already exists from a previous run. Request its token via /token.
      try {
        await tg.sendMessage(botFather, { message: '/token' });
        await sleep(1000);
        await tg.sendMessage(botFather, { message: `@${botUsername}` });
        await sleep(1500);

        const tokenMsgs = await tg.getMessages(botFather, { limit: 3 });
        for (const msg of tokenMsgs) {
          const tokenMatch = (msg.text ?? '').match(/(\d+:[A-Za-z0-9_-]+)/);
          if (tokenMatch) {
            return {
              botUsername,
              botToken: tokenMatch[1],
              botDisplayName: botName,
            };
          }
        }
      } catch {
        // Fall through to random suffix fallback
      }

      // /token didn't work (maybe bot is owned by a different account).
      // Try with a random suffix.
      const fallbackRand = Math.random().toString(36).slice(2, 8).toLowerCase();
      const fallbackUsername = `sw_${fallbackRand}_bot`;
      await tg.sendMessage(botFather, { message: '/newbot' });
      await sleep(1000);
      await tg.sendMessage(botFather, { message: botName });
      await sleep(1000);
      await tg.sendMessage(botFather, { message: fallbackUsername });
      await sleep(1500);

      const retryMsgs = await tg.getMessages(botFather, { limit: 3 });
      for (const msg of retryMsgs) {
        const tokenMatch = (msg.text ?? '').match(/(\d+:[A-Za-z0-9_-]+)/);
        if (tokenMatch) {
          return {
            botUsername: fallbackUsername,
            botToken: tokenMatch[1],
            botDisplayName: botName,
          };
        }
      }
    }
    throw new Error(
      'Failed to create Telegram bot — could not extract token from BotFather response',
    );
  }

  // Optionally set the bot's description and about text
  try {
    await tg.sendMessage(botFather, { message: '/setdescription' });
    await sleep(1000);
    await tg.sendMessage(botFather, { message: `@${botUsername}` });
    await sleep(1000);
    await tg.sendMessage(botFather, {
      message:
        'Your personal AI assistant powered by ShiftWorker. I can manage your email, calendar, browse the web, and much more.',
    });
    await sleep(1000);

    // Disable group privacy so bot can see all messages, not just @mentions
    await tg.sendMessage(botFather, { message: '/setprivacy' });
    await sleep(1000);
    await tg.sendMessage(botFather, { message: `@${botUsername}` });
    await sleep(1000);
    await tg.sendMessage(botFather, { message: 'Disable' });
    await sleep(1000);
  } catch {
    // Non-critical — bot works without description/privacy changes
  }

  return { botUsername, botToken, botDisplayName: botName };
}

/**
 * Delete a Telegram bot via BotFather.
 */
export async function deleteTelegramBot(botUsername: string): Promise<void> {
  const tg = await getClient();
  const botFather = await tg.getEntity('BotFather');

  await tg.sendMessage(botFather, { message: '/deletebot' });
  await sleep(1000);
  await tg.sendMessage(botFather, { message: `@${botUsername}` });
  await sleep(1000);
  // BotFather asks "Are you sure?" — confirm
  await tg.sendMessage(botFather, { message: 'Yes, I am totally sure.' });
  await sleep(1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
