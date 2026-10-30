import { z } from 'zod';
import { imageDefaults, videoDefaults } from '../kit-tokens';
import { PluginAssetRef } from './assets';
import { stringLabel } from './kit-component-props';

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
    .meta({ default: imageDefaults.fit })
    .describe('Fill and crop, or show the whole image.'),
  radius: z
    .enum(['none', 'control', 'container'])
    .optional()
    .meta({ default: imageDefaults.radius })
    .describe('Semantic frame radius.'),
  accessibilityLabel: stringLabel.describe('Spoken description of the image.'),
});

// Media names a reference from `argo.assets.resolve`, so the App loads it from the Server's asset route, never from a Plugin's host (ADR-0031).
const resolved =
  'from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched.';

const videoAsset = PluginAssetRef.extend({
  format: z.enum(['mp4', 'webm', 'mov']),
}).describe(`The video, ${resolved}`);

const audioAsset = PluginAssetRef.extend({
  format: z.enum(['mp3', 'm4a', 'ogg', 'wav', 'aac', 'flac']),
}).describe(`The audio, ${resolved}`);

const posterAsset = PluginAssetRef.extend({
  format: z.enum(['png', 'jpeg', 'gif', 'webp', 'avif']),
}).describe(`An image drawn before play, ${resolved}`);

export const videoProps = z.object({
  source: videoAsset,
  poster: posterAsset.optional(),
  aspect: z
    .enum(['landscape', 'square', 'portrait'])
    .optional()
    .meta({ default: videoDefaults.aspect })
    .describe(
      'Frame aspect: landscape 16:9 (default), square 1:1, portrait 9:16.',
    ),
  radius: z
    .enum(['control', 'none'])
    .optional()
    .meta({ default: videoDefaults.radius })
    .describe('Corner radius token: control (default) or none.'),
  autoPlay: z
    .boolean()
    .optional()
    .describe(
      'Play at once, muted and looping, with the controls hidden until tapped. Stays paused with Reduce Motion.',
    ),
  accessibilityLabel: stringLabel.describe('Spoken name of the video.'),
});

export const audioProps = z.object({
  source: audioAsset,
  accessibilityLabel: stringLabel.describe(
    'Spoken name of the audio; names its play button and scrubber.',
  ),
});
