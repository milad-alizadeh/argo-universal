import { setTimeout as delay } from 'node:timers/promises';
import {
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { z } from 'zod';

// `pnpm dev` starts the Server, Expo, and desktop together; desktop waits for the other two.
const home = resolveRuntimeDirectory();
const webUrl = process.env.ARGO_EXPO_WEB_URL ?? 'http://localhost:8081';
const timeoutMs = 300_000;
const requestTimeoutMs = 2000;
const retryDelayMs = 500;

// The part of the system.info answer this script reads.
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

// True once server.json in `home` names a port and system.info, over tRPC's HTTP handler on that port, answers.
export async function serverAnswers(home: string): Promise<boolean> {
  const address = readServerAddress(home);
  if (!address) return false;
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
  console.log(
    `Waiting for server.json in ${home}, its system.info, and ${webUrl}`,
  );
  const deadline = Date.now() + timeoutMs;
  while (!((await serverAnswers(home)) && (await webAnswers()))) {
    if (Date.now() > deadline) {
      console.error(`Gave up waiting for the Server in ${home} and ${webUrl}`);
      process.exit(1);
    }
    await delay(retryDelayMs);
  }
}
