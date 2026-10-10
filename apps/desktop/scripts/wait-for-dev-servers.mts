import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { z } from 'zod';

// `pnpm dev` starts the Server, Expo, and desktop together; desktop waits for the other two.
const serverFile = join(resolveRuntimeDirectory(), 'server.json');
const webUrl = process.env.ARGO_EXPO_WEB_URL ?? 'http://localhost:8081';
const timeoutMs = 300_000;
const requestTimeoutMs = 2000;
const retryDelayMs = 500;

// Plain Node cannot load @repo/contracts from source, so these copy the fields this script reads.
const ServerAddress = z.object({ port: z.int() });
const SystemInfoResponse = z.object({
  result: z.object({ data: z.object({ version: z.string() }) }),
});

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

// True once server.json names a port and system.info, over tRPC's HTTP handler on that port, answers.
export async function serverAnswers(file: string): Promise<boolean> {
  let address: unknown;
  try {
    address = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return false;
  }
  if (!isRecognised('server.json', ServerAddress, address)) return false;
  let info: unknown;
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/trpc/system.info`,
      { signal: AbortSignal.timeout(requestTimeoutMs) },
    );
    if (!response.ok) return false;
    info = await response.json();
  } catch {
    return false;
  }
  return isRecognised('system.info answer', SystemInfoResponse, info);
}

const webAnswers = async (): Promise<boolean> => {
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
  console.log(`Waiting for ${serverFile}, its system.info, and ${webUrl}`);
  const deadline = Date.now() + timeoutMs;
  while (!((await serverAnswers(serverFile)) && (await webAnswers()))) {
    if (Date.now() > deadline) {
      console.error(`Gave up waiting for ${serverFile} and ${webUrl}`);
      process.exit(1);
    }
    await delay(retryDelayMs);
  }
}
