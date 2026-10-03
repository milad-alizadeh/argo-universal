import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

// `pnpm dev` starts the Server, Expo, and desktop together; desktop waits for the other two (spec section 10).
const serverFile = join(
  process.env.ARGO_HOME ?? join(homedir(), '.argo'),
  'server.json',
);
const webUrl = process.env.ARGO_EXPO_WEB_URL ?? 'http://localhost:8081';
const timeoutMs = 5 * 60_000;
const requestTimeoutMs = 2000;

// Plain Node cannot load @repo/contracts from source, so these copy the fields this script reads.
const ServerAddress = z.object({ port: z.int() });
const ServerHealthResponse = z.object({ ok: z.literal(true) });

let unrecognisedShapes = 0;
const isRecognised = <Shape extends z.ZodType>(
  source: string,
  schema: Shape,
  value: unknown,
): value is z.infer<Shape> => {
  const result = schema.safeParse(value);
  if (result.success) return true;
  unrecognisedShapes += 1;
  console.error(
    `wait-for-dev-servers: unrecognised ${source} #${unrecognisedShapes}`,
    result.error.issues,
  );
  return false;
};

// True once server.json names a port and /health on that port answers.
export async function serverAnswers(file: string) {
  let address: unknown;
  try {
    address = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return false;
  }
  if (!isRecognised('server.json', ServerAddress, address)) return false;
  let health: unknown;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) return false;
    health = await response.json();
  } catch {
    return false;
  }
  return isRecognised('/health answer', ServerHealthResponse, health);
}

const webAnswers = async () => {
  try {
    const response = await fetch(webUrl, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
};

if (import.meta.main) {
  console.log(`Waiting for ${serverFile}, its /health, and ${webUrl}`);
  const deadline = Date.now() + timeoutMs;
  while (!((await serverAnswers(serverFile)) && (await webAnswers()))) {
    if (Date.now() > deadline) {
      console.error(`Gave up waiting for ${serverFile} and ${webUrl}`);
      process.exit(1);
    }
    await delay(500);
  }
}
