import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { RequestError } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import type { RequestGuard } from './request-guard';

export interface HttpAppOptions {
  guard: RequestGuard;
  blobsFolder: string;
  version: string;
  startedAt: string;
}

// A blob id is the sha256 of its content, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);

const openBlob = (path: string) =>
  open(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });

// Plain HTTP serves only /health and /blobs/:id (ADR 0002); tRPC runs over the WebSocket.
export function createHttpApp(options: HttpAppOptions) {
  const app = new Hono();
  app.use(async (context, next) => {
    if (!options.guard.allowsRequest({ host: context.req.header('host') }))
      return context.json({ error: 'Forbidden' }, 403);
    if (context.req.method !== 'GET')
      return context.json({ error: 'Method not allowed' }, 405, {
        Allow: 'GET',
      });
    await next();
  });
  app.get('/health', (context) =>
    context.json({
      ok: true,
      version: options.version,
      startedAt: options.startedAt,
    }),
  );
  app.get('/blobs/:id', async (context) => {
    const blobId = BlobId.safeParse(context.req.param('id'));
    if (!blobId.success) {
      options.guard.report('blob id', context.req.param('id'));
      return context.json({ error: 'Not found' }, 404);
    }
    const file = await openBlob(join(options.blobsFolder, blobId.data));
    if (!file) return context.json({ error: 'Not found' }, 404);
    const stats = await file.stat().catch(async (error: unknown) => {
      await file.close();
      throw error;
    });
    if (!stats.isFile()) {
      await file.close();
      return context.json({ error: 'Not found' }, 404);
    }
    return context.body(Readable.toWeb(file.createReadStream()), 200, {
      'content-type': 'application/octet-stream',
      'content-length': String(stats.size),
    });
  });
  app.notFound((context) => context.json({ error: 'Not found' }, 404));
  app.onError((error, context) => {
    console.error(`engine: ${String(error)}`);
    return context.json({ error: 'Internal error' }, 500);
  });
  return app;
}

// The adapter throws a RequestError before the app runs when it cannot build a URL, for example from a Host such as "a@b".
export const createRequestErrorHandler =
  (guard: RequestGuard) => (error: unknown) => {
    if (error instanceof RequestError) {
      guard.report('request', error.message);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error(`engine: ${String(error)}`);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  };
