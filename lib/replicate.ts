import Replicate from 'replicate';
import { requireEnv } from './env';

let client: Replicate | null = null;

export function replicate(): Replicate {
  if (client) return client;
  client = new Replicate({ auth: requireEnv('REPLICATE_API_TOKEN') });
  return client;
}
