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
 * Extract a bot token from BotFather messages.
 * Returns the token string or null if not found.
 */
function extractTokenFromMessages(messages: { text?: string }[]): string | null {
  for (const msg of messages) {
    const text = msg.text ?? '';
    const tokenMatch = text.match(/(\d+:[A-Za-z0-9_-]+)/);
    if (tokenMatch) return tokenMatch[1];
  }
  return null;
}

/**
 * Check if BotFather's response indicates the username is taken.
 */
function isUsernameTaken(messages: { text?: string }[]): boolean {
  const lastMsg = messages[0]?.text ?? '';
  return lastMsg.includes('already taken') || lastMsg.includes('already been taken');
}

/**
 * Attempt to create a bot with BotFather and extract the token.
 * Uses longer delays and a retry read to handle slow BotFather responses.
 */
async function attemptBotCreation(
  tg: TelegramClient,
  botFather: any,
  username: string,
  displayName: string,
): Promise<{ token: string | null; usernameTaken: boolean }> {
  await tg.sendMessage(botFather, { message: '/newbot' });
  await sleep(2000);

  await tg.sendMessage(botFather, { message: displayName });
  await sleep(2000);

  await tg.sendMessage(botFather, { message: username });
  await sleep(3000);

  // First read attempt
  let messages = await tg.getMessages(botFather, { limit: 3 });
  let token = extractTokenFromMessages(messages);
  if (token) return { token, usernameTaken: false };

  // BotFather may be slow - wait and retry
  await sleep(3000);
  messages = await tg.getMessages(botFather, { limit: 5 });
  token = extractTokenFromMessages(messages);
  if (token) return { token, usernameTaken: false };

  return { token: null, usernameTaken: isUsernameTaken(messages) };
}

/**
 * Try to retrieve an existing bot's token via /token command.
 */
async function tryGetExistingToken(
  tg: TelegramClient,
  botFather: any,
  username: string,
): Promise<string | null> {
  try {
    await tg.sendMessage(botFather, { message: '/token' });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: `@${username}` });
    await sleep(3000);

    const tokenMsgs = await tg.getMessages(botFather, { limit: 3 });
    return extractTokenFromMessages(tokenMsgs);
  } catch {
    return null;
  }
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

  const botFather = await tg.getEntity('BotFather');

  // Attempt 1: create with primary username
  const result = await attemptBotCreation(tg, botFather, botUsername, botName);

  if (result.token) {
    await configureBotSettings(tg, botFather, botUsername);
    return { botUsername, botToken: result.token, botDisplayName: botName };
  }

  // Username taken - try to recover the existing bot's token
  if (result.usernameTaken) {
    const existingToken = await tryGetExistingToken(tg, botFather, botUsername);
    if (existingToken) {
      return { botUsername, botToken: existingToken, botDisplayName: botName };
    }

    // Can't recover existing token - try with a different random suffix
    const fallbackRand = Math.random().toString(36).slice(2, 8).toLowerCase();
    const fallbackUsername = `sw_${fallbackRand}_bot`;
    const fallbackResult = await attemptBotCreation(tg, botFather, fallbackUsername, botName);

    if (fallbackResult.token) {
      await configureBotSettings(tg, botFather, fallbackUsername);
      return {
        botUsername: fallbackUsername,
        botToken: fallbackResult.token,
        botDisplayName: botName,
      };
    }
  }

  // All attempts failed
  throw new Error('telegram_bot_creation_failed');
}

/**
 * Configure bot description, privacy, and group settings (best-effort).
 */
async function configureBotSettings(
  tg: TelegramClient,
  botFather: any,
  username: string,
): Promise<void> {
  try {
    // Set bot description
    await tg.sendMessage(botFather, { message: '/setdescription' });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: `@${username}` });
    await sleep(2000);
    await tg.sendMessage(botFather, {
      message:
        'Your personal AI assistant powered by ShiftWorker. I can manage your email, calendar, browse the web, and much more.',
    });
    await sleep(2000);

    // Disable group privacy so bot can see all messages, not just /commands
    await tg.sendMessage(botFather, { message: '/setprivacy' });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: `@${username}` });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: 'Disable' });
    await sleep(2000);

    // Enable group joining so users can add the bot to group chats
    await tg.sendMessage(botFather, { message: '/setjoingroups' });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: `@${username}` });
    await sleep(2000);
    await tg.sendMessage(botFather, { message: 'Enable' });
    await sleep(2000);

    // Verify settings were applied by reading BotFather's responses
    const msgs = await tg.getMessages(botFather, { limit: 3 });
    const lastMsg = msgs[0]?.text ?? '';
    if (lastMsg.includes('ENABLED')) {
      console.log(`Bot @${username}: group joining enabled`);
    }
  } catch {
    // Non-critical - bot works without these settings but groups may not work
    console.warn(`Failed to configure BotFather settings for @${username}`);
  }
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
  // BotFather asks "Are you sure?" - confirm
  await tg.sendMessage(botFather, { message: 'Yes, I am totally sure.' });
  await sleep(1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
