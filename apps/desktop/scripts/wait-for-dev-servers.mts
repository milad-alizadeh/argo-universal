import { setTimeout as delay } from 'node:timers/promises';
import {
  readControlToken,
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { createRejectionCounter } from '@repo/machine-log';
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

const rejections = createRejectionCounter('wait-for-dev-servers');

const isRecognised = <Schema extends z.ZodType>(
  source: string,
  schema: Schema,
  value: unknown,
): value is z.infer<Schema> => {
  const result = schema.safeParse(value);

  if (result.success) return true;
  rejections.report(`unrecognised ${source}`, result.error.issues);

  return false;
};

/*
 * Every Connection now says which Device it is, and this script has no page of its own to be recognised by, so it shows the user token the Server minted (ADR-0044, #1696).
 * Without it the Server answers 401 and `pnpm dev` waits for a Server that is already running.
 */
async function fetchSystemInfo(home: string, port: number): Promise<boolean> {
  const response = await fetch(`http://127.0.0.1:${port}/trpc/system.info`, {
    headers: { authorization: `Bearer ${await readControlToken(home)}` },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) return false;

  return isRecognised(
    'system.info answer',
    SystemInfoResponse,
    await response.json(),
  );
}

// True once server.json in `home` names a port and system.info, over tRPC's HTTP handler on that port, answers.
export async function serverAnswers(home: string): Promise<boolean> {
  const address = readServerAddress(home);

  if (!address) return false;

  try {
    return await fetchSystemInfo(home, address.port);
  } catch {
    return false;
  }
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
