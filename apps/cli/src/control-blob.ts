import { setTimeout as delay } from 'node:timers/promises';
import type { BlobRef } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { z } from 'zod';

const missingBlobStatus = 404;

const blobRetryMs = 25;

// The same command deadline covers the RPC, queued Blob write and full JSON download.
export async function readControlBlob(
  blob: BlobRef,
  deadline: number,
): Promise<Json> {
  const address = readServerAddress(resolveRuntimeDirectory());

  if (!address) throw new Error('No Server found. Start it with argo server.');

  const signal = AbortSignal.timeout(
    Math.max(0, Math.ceil(deadline - performance.now())),
  );

  const url = `http://127.0.0.1:${address.port}/blobs/${encodeURIComponent(blob.blobId)}`;

  return z.json().parse(await (await storedBlob(url, signal)).json());
}

async function storedBlob(url: string, signal: AbortSignal): Promise<Response> {
  while (true) {
    const response = await fetch(url, { signal });

    if (response.ok) return response;

    await waitForBlob(response, signal);
  }
}

async function waitForBlob(
  response: Response,
  signal: AbortSignal,
): Promise<void> {
  if (response.status !== missingBlobStatus)
    throw new Error(
      `The Operation result Blob returned HTTP ${response.status}`,
    );
  await response.body?.cancel();
  await delay(blobRetryMs, undefined, { signal });
}
