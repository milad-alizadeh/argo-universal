import { extname } from 'node:path';
import {
  PluginAssetFormat,
  pluginAssetMediaTypes,
} from '@repo/contracts/plugins/assets';

export const pluginAssetLimitBytes = 67_108_864;

export type AssetContent = { bytes: Buffer; format: PluginAssetFormat };

export async function assetBytes(
  stream: AsyncIterable<Uint8Array>,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  let size = 0;

  for await (const chunk of stream) {
    size += chunk.byteLength;

    if (size > pluginAssetLimitBytes)
      throw new Error(`Asset exceeds the ${pluginAssetLimitBytes} byte limit`);
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export function assetFormat(path: string): PluginAssetFormat {
  const extension = extname(path).slice(1).toLowerCase();

  const format = PluginAssetFormat.safeParse(
    extension === 'jpg' ? 'jpeg' : extension,
  );

  if (!format.success) throw new Error('Unsupported asset media type');

  return format.data;
}

const mediaFormats = new Map(
  PluginAssetFormat.options.map((format) => [
    pluginAssetMediaTypes[format],
    format,
  ]),
);

export function responseFormat(
  contentType: string | undefined,
): PluginAssetFormat {
  const format = mediaFormats.get(responseMediaType(contentType));

  if (!format) throw new Error('Unsupported asset media type');

  return format;
}

function responseMediaType(contentType = ''): string {
  const [type = ''] = contentType.split(';');

  return type.trim().toLowerCase();
}
