import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  PluginAssetRef,
  pluginAssetMediaTypes,
} from '@repo/contracts/plugins/assets';
import type { OpenedAsset, PluginRuntime } from '../plugins';
import { transferAsset } from './asset-transfer';
import { answerError, httpStatus, reportHttpFailure } from './http-response';

export type AssetReader = PluginRuntime['openAsset'];

type AssetServices = { readAsset: AssetReader };

type AssetHeaders = {
  'content-type': string;
  'cache-control': string;
  etag: string;
  'x-content-type-options': string;
  'content-security-policy': string;
  vary: string;
};

const assetRoute = /^\/plugin-assets\/([^/]+)\/([^.]+)\.([^/?]+)$/;

const readMethods = new Set(['GET', 'HEAD']);

// Whoever is asking was settled by the listener, which admits no request this route would have to turn away itself (#1696).
export function handleAsset(
  options: AssetServices,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (!isReadMethod(request.method)) return methodNotAllowed(response);

  allowOrigin(request.headers.origin, response);
  serveAsset(options.readAsset, request, response).catch(
    (cause: unknown): void => reportHttpFailure(response, cause),
  );
}

const isReadMethod = (method = ''): boolean => readMethods.has(method);

function methodNotAllowed(response: ServerResponse): void {
  answerError(response, httpStatus.methodNotAllowed, {
    message: 'Method not allowed',
    headers: { allow: 'GET, HEAD' },
  });
}

function allowOrigin(
  origin: string | undefined,
  response: ServerResponse,
): void {
  if (origin) response.setHeader('access-control-allow-origin', origin);
}

function assetReference(path: string): PluginAssetRef | null {
  const match = assetRoute.exec(path);

  if (!match) return null;

  const parsed = PluginAssetRef.safeParse({
    pluginId: match[1],
    hash: match[2],
    format: match[3],
  });

  return parsed.success ? parsed.data : null;
}

async function openRequestedAsset(
  read: AssetReader,
  path = '',
): Promise<OpenedAsset | null> {
  const reference = assetReference(path);

  if (!reference) return null;

  return read(reference);
}

async function serveAsset(
  read: AssetReader,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const opened = await openRequestedAsset(read, request.url);

  if (!opened) return answerError(response, httpStatus.notFound, 'Not found');

  try {
    await respond(opened, request, response);
  } finally {
    await opened.file.close();
  }
}

function cacheHeaders({ reference }: OpenedAsset): AssetHeaders {
  return {
    'content-type': pluginAssetMediaTypes[reference.format],
    'cache-control': 'private, max-age=31536000, immutable',
    etag: `"${reference.hash}"`,
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    vary: 'Origin',
  };
}

function isNotModified(header = '', etag: string): boolean {
  return header
    .split(',')
    .some(
      (value) =>
        value.trim().replace(/^W\//, '') === etag || value.trim() === '*',
    );
}

async function respond(
  opened: OpenedAsset,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const headers = cacheHeaders(opened);
  setCacheHeaders(response, headers);

  if (answerNotModified(opened, request, response)) return;

  await transferAsset(opened, request, response);
}

function answerNotModified(
  opened: OpenedAsset,
  request: IncomingMessage,
  response: ServerResponse,
): boolean {
  const etag = `"${opened.reference.hash}"`;

  if (!isNotModified(request.headers['if-none-match'], etag)) return false;

  response.writeHead(httpStatus.notModified);
  response.end();

  return true;
}

function setCacheHeaders(
  response: ServerResponse,
  headers: Record<string, string>,
): void {
  response.setHeader('accept-ranges', 'bytes');

  for (const [name, value] of Object.entries(headers))
    response.setHeader(name, value);
}
