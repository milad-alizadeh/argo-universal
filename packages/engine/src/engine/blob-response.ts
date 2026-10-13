import type { FileHandle } from 'node:fs/promises';
import { open } from 'node:fs/promises';
import type { ServerResponse, IncomingMessage } from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { answerError, httpStatus } from './http-response';
import type { RequestGuard } from './request-guard';

// A blob id is its sha256, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);
type BlobSource = { guard: RequestGuard; blobsFolder: string };

const openBlob = (path: string): Promise<void | FileHandle> =>
  open(path).catch((error: NodeJS.ErrnoException): void => {
    if (error.code === 'ENOENT') return;
    throw error;
  });

async function blobStats(file: FileHandle): Promise<number | undefined> {
  const stats = await file
    .stat()
    .catch(async (error: unknown): Promise<never> => {
      await file.close();
      throw error;
    });
  if (stats.isFile()) return stats.size;
  await file.close();
  return undefined;
}

// The read stream closes its file; scrolling an image away may close the socket early.
function ignoreClientDisconnect(error: NodeJS.ErrnoException): void {
  if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
}

async function pipeBlob(
  file: FileHandle,
  response: ServerResponse,
): Promise<void> {
  const size = await blobStats(file);
  if (size === undefined)
    return answerError(response, httpStatus.notFound, 'Not found');
  response.writeHead(httpStatus.ok, {
    'content-type': 'application/octet-stream',
    'content-length': String(size),
  });
  await pipeline(file.createReadStream(), response).catch(
    ignoreClientDisconnect,
  );
}

async function streamBlob(
  source: BlobSource,
  id: string,
  response: ServerResponse,
): Promise<void> {
  const blobId = BlobId.safeParse(id);
  if (!blobId.success) {
    source.guard.report('blob id', id);
    return answerError(response, httpStatus.notFound, 'Not found');
  }
  const file = await openBlob(join(source.blobsFolder, blobId.data));
  if (!file) return answerError(response, httpStatus.notFound, 'Not found');
  await pipeBlob(file, response);
}

function reportBlobError(response: ServerResponse, error: unknown): void {
  console.error(`engine: ${String(error)}`);
  if (response.headersSent) response.destroy();
  else answerError(response, httpStatus.internalError, 'Internal error');
}

type BlobResponse = (
  id: string,
  request: IncomingMessage,
  response: ServerResponse,
) => void;

function answerWrongMethod(response: ServerResponse): void {
  response.setHeader('allow', 'GET');
  answerError(response, httpStatus.methodNotAllowed, 'Method not allowed');
}

export const createBlobResponse =
  (source: BlobSource): BlobResponse =>
  (id, request, response): void => {
    if (request.method !== 'GET') return answerWrongMethod(response);
    streamBlob(source, id, response).catch((error: unknown): void =>
      reportBlobError(response, error),
    );
  };
