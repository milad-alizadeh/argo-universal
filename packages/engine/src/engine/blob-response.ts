import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { open } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { answerError, httpStatus } from './http-response';
import type { RequestGuard } from './request-guard';
// A blob id is the sha256 of its content, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);
const openBlob = (path: string): Promise<void | FileHandle> =>
  open(path).catch((error: NodeJS.ErrnoException): void => {
    if (error.code === 'ENOENT') return;
    throw error;
  });

export async function streamBlob(
  options: { guard: RequestGuard; blobsFolder: string },
  id: string,
  response: ServerResponse,
): Promise<void> {
  const blobId = BlobId.safeParse(id);
  if (!blobId.success) {
    options.guard.report('blob id', id);
    return answerError(response, httpStatus.notFound, 'Not found');
  }
  const file = await openBlob(join(options.blobsFolder, blobId.data));
  if (!file) return answerError(response, httpStatus.notFound, 'Not found');
  await streamOpenedBlob(file, response);
}

async function streamOpenedBlob(
  file: FileHandle,
  response: ServerResponse,
): Promise<void> {
  const stats = await statBlob(file);
  if (!stats.isFile()) {
    await file.close();
    return answerError(response, httpStatus.notFound, 'Not found');
  }
  response.writeHead(httpStatus.ok, {
    'content-type': 'application/octet-stream',
    'content-length': String(stats.size),
  });
  await pipeBlob(file, response);
}

async function pipeBlob(
  file: FileHandle,
  response: ServerResponse,
): Promise<void> {
  // The read stream closes the file when it ends or fails.
  await pipeline(file.createReadStream(), response).catch(
    (error: NodeJS.ErrnoException): void => {
      // A client that closes the socket before the end, such as an image scrolled away, is no Engine error.
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
    },
  );
}

async function statBlob(file: FileHandle): Promise<Stats> {
  return file.stat().catch(async (error: unknown): Promise<never> => {
    await file.close();
    throw error;
  });
}
