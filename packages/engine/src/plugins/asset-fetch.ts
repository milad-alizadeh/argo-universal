import type { IncomingMessage } from 'node:http';
import { assetBytes, responseFormat, type AssetContent } from './asset-content';

const ok = 200;

export async function readAssetResponse(
  response: IncomingMessage,
): Promise<AssetContent> {
  try {
    requireFullResponse(response);
    requireIdentityEncoding(response.headers['content-encoding']);

    return {
      format: responseFormat(response.headers['content-type']),
      bytes: await assetBytes(response),
    };
  } finally {
    response.destroy();
  }
}

function requireFullResponse(response: IncomingMessage): void {
  if (response.statusCode !== ok)
    throw new Error(`Asset request failed (${response.statusCode ?? 0})`);
}

function requireIdentityEncoding(encoding: string | undefined): void {
  if (encoding && encoding !== 'identity')
    throw new Error('Asset response must not be compressed');
}
