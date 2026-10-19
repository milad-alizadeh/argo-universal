import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';

export const PluginAssetFormat = z.enum([
  'png',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'bmp',
  'ico',
  'mp4',
  'webm',
  'mov',
  'mp3',
  'm4a',
  'ogg',
  'wav',
  'aac',
  'flac',
]);

export type PluginAssetFormat = z.infer<typeof PluginAssetFormat>;

export const pluginAssetMediaTypes: Record<PluginAssetFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

export const PluginAssetRef = z.strictObject({
  pluginId: PluginIdentifier,
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  format: PluginAssetFormat,
});

export type PluginAssetRef = z.infer<typeof PluginAssetRef>;

export const PluginAssetSource = z.union([
  z.strictObject({ asset: z.string().min(1) }),
  z.strictObject({
    url: z.string().min(1),
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);

export type PluginAssetSource = z.infer<typeof PluginAssetSource>;

export const PluginAssetRequest = z.object({
  api: z.literal('assets'),
  source: PluginAssetSource,
});

export function pluginAssetPath(reference: PluginAssetRef): string {
  const { pluginId, hash, format } = PluginAssetRef.parse(reference);

  return `/plugin-assets/${pluginId}/${hash}.${format}`;
}
