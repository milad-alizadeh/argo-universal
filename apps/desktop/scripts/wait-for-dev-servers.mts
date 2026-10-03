import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// `pnpm dev` starts the Server, Expo, and desktop together; desktop waits for the other two (spec section 10).
const serverFile = join(
  process.env.ARGO_HOME ?? join(homedir(), '.argo'),
  'server.json',
);
const webUrl = process.env.ARGO_EXPO_WEB_URL ?? 'http://localhost:8081';
const timeoutMs = 5 * 60_000;

const webAnswers = async () => {
  try {
    const response = await fetch(webUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
};

console.log(`Waiting for ${serverFile} and ${webUrl}`);
const deadline = Date.now() + timeoutMs;
while (!(existsSync(serverFile) && (await webAnswers()))) {
  if (Date.now() > deadline) {
    console.error(`Gave up waiting for ${serverFile} and ${webUrl}`);
    process.exit(1);
  }
  await delay(500);
}
