import type { IncomingMessage, ServerResponse } from 'node:http';
import { pipeline } from 'node:stream/promises';
import type { OpenedAsset } from '../plugins';
import { assetRange, type AssetRange } from './asset-range';

const partialContent = 206;

const rangeNotSatisfiable = 416;

const ok = 200;

type AssetTransfer = {
  status: number;
  headers: Record<string, string | number>;
};

export async function transferAsset(
  opened: OpenedAsset,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method === 'HEAD') return endHead(opened, response);
  const range = requestedRange(opened, request);

  if (range === 'unsatisfiable') return endUnsatisfiable(opened, response);

  await streamAsset(opened, range, response);
}

function endHead(opened: OpenedAsset, response: ServerResponse): void {
  response.writeHead(ok, { 'content-length': opened.bytes });
  response.end();
}

function requestedRange(
  opened: OpenedAsset,
  request: IncomingMessage,
): ReturnType<typeof assetRange> {
  const ifRange = request.headers['if-range'];

  if (ifRange && ifRange !== `"${opened.reference.hash}"`) return null;

  return assetRange(request.headers.range, opened.bytes);
}

function rangeHeaders(
  opened: OpenedAsset,
  range: AssetRange | null,
): AssetTransfer {
  if (!range)
    return { status: ok, headers: { 'content-length': opened.bytes } };

  return {
    status: partialContent,
    headers: {
      'content-length': range.end - range.start + 1,
      'content-range': `bytes ${range.start}-${range.end}/${opened.bytes}`,
    },
  };
}

async function streamAsset(
  opened: OpenedAsset,
  range: AssetRange | null,
  response: ServerResponse,
): Promise<void> {
  const { status, headers } = rangeHeaders(opened, range);
  response.writeHead(status, headers);
  await pipeline(
    opened.file.createReadStream({ ...range, autoClose: false }),
    response,
  ).catch((error: NodeJS.ErrnoException): void => {
    if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
  });
}

function endUnsatisfiable(opened: OpenedAsset, response: ServerResponse): void {
  response.writeHead(rangeNotSatisfiable, {
    'content-range': `bytes */${opened.bytes}`,
  });
  response.end();
}
