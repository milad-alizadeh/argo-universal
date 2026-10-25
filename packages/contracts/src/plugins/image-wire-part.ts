import { z } from 'zod';
import { PluginAssetRef } from './assets';
import { part, stringLabel } from './plugin-part-schema-utils';

export const imageAsset = PluginAssetRef.extend({
  format: z.enum(['png', 'jpeg', 'gif', 'webp', 'avif']),
});

const squareAspect = 1;

const photoAspect = 1.3333333333333333;

const wideAspect = 1.7777777777777777;

const imageAspects: ReadonlySet<number> = new Set([
  squareAspect,
  photoAspect,
  wideAspect,
]);

export const imageProps = z.object({
  source: imageAsset
    .optional()
    .describe(
      'Image resolved by argo.assets.resolve; loaded through the Server.',
    ),
  sources: z
    .object({ light: imageAsset.optional(), dark: imageAsset.optional() })
    .optional()
    .describe(
      'Appearance-specific sources, falling back to light then source.',
    ),
  aspect: z
    .union([
      z
        .number()
        .refine((value) => imageAspects.has(value), 'Use 1, 4/3 or 16/9'),
      z.literal('intrinsic'),
    ])
    .optional()
    .describe('Frame aspect, or the image’s intrinsic ratio.'),
  fit: z
    .enum(['cover', 'contain'])
    .optional()
    .describe('Fill and crop, or show the whole image.'),
  radius: z
    .enum(['none', 'control', 'container'])
    .optional()
    .describe('Semantic frame radius.'),
  accessibilityLabel: stringLabel.describe('Spoken description of the image.'),
});

export const imageWirePart = part(
  'An image loaded through the Server, with loading and error frames.',
  imageProps,
  { group: 'content' },
);
