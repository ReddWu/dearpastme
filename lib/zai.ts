import OpenAI, { type ClientOptions } from 'openai';
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletion } from 'openai/resources/chat/completions';
import { requireEnv, ZAI_BASE_URL, ZAI_MODEL, ZAI_PARSE_MODEL } from './env';

let client: OpenAI | null = null;

export function zai(): OpenAI {
  if (client) return client;
  const opts: ClientOptions = {
    apiKey: requireEnv('ZAI_API_KEY'),
    baseURL: ZAI_BASE_URL,
  };
  client = new OpenAI(opts);
  return client;
}

export { ZAI_MODEL, ZAI_PARSE_MODEL };

const DEFAULT_TIMEOUT_MS = 60_000;

// Wrap chat.completions.create with friendly error mapping + a hard timeout.
// Upstreams can hang indefinitely (a reasoning chain on a long input took
// 220s in the wild); a 60s ceiling lets the UI fail fast with a poetic
// message instead of locking the screen.
export async function zaiChat(
  args: ChatCompletionCreateParamsNonStreaming,
  opts: { timeoutMs?: number } = {},
): Promise<ChatCompletion> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await zai().chat.completions.create(args, { signal: ctrl.signal });
  } catch (err) {
    const status = (err as { status?: number; statusCode?: number })?.status
      ?? (err as { statusCode?: number })?.statusCode;
    const msg = err instanceof Error ? err.message : String(err);

    if (ctrl.signal.aborted || /aborted|timeout/i.test(msg)) {
      throw new Error("The line went quiet. The narrator didn't answer in time — try again.");
    }
    if (status === 429 || /insufficient balance|no resource package|quota/i.test(msg)) {
      throw new Error(
        "The narrator has run out of breath — your Z.AI account balance is empty. " +
        "Top up at https://z.ai, or swap ZAI_BASE_URL / ZAI_API_KEY / ZAI_MODEL " +
        "in .env.local to any OpenAI-compatible provider (OpenRouter, OpenAI, DeepSeek, etc).",
      );
    }
    if (status === 401 || status === 403) {
      throw new Error('The provider rejected the key — check ZAI_API_KEY in .env.local.');
    }
    if (status === 404 && /no endpoints available|guardrail/i.test(msg)) {
      throw new Error(
        'No upstream provider could serve this model under your privacy policy. ' +
        'Try a different ZAI_MODEL or relax your provider settings.',
      );
    }
    if (status && status >= 500) {
      throw new Error('The provider is having trouble. Try once more in a moment.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
