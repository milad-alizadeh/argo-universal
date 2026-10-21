import { z } from 'zod';
import * as accessibility from '../part-accessibility-metadata';
import { part, stringLabel, imageSource } from '../plugin-part-schema-utils';
import { avatarProps } from '../presentation-kit-props';
import { iconProps } from '../presentation-kit-props';
import { wireParts } from '../wire-parts';

export const contentPartSchemas = {
  Icon: part(
    'A native symbol with semantic size, tone, and optional status mark.',
    iconProps,
    {
      label:
        'The surrounding control supplies the accessible name; this symbol is decorative.',
      accessibility: accessibility.iconAccessibility,
    },
  ),
  Image: part(
    'An image from a Plugin asset or remote URL, with optional light and dark sources.',
    z
      .object({
        source: imageSource.optional(),
        sources: z
          .object({
            light: imageSource.optional(),
            dark: imageSource.optional(),
          })
          .optional()
          .describe(
            'Appearance-specific sources; `dark` is used in dark appearance and falls back to `light`.',
          ),
        aspect: z
          .enum(['square', 'landscape', 'portrait'])
          .optional()
          .describe('Media aspect ratio.'),
        fit: z
          .enum(['cover', 'contain', 'fill'])
          .optional()
          .describe('Image fitting mode.'),
        radius: z.string().optional().describe('Semantic radius token.'),
        accessibilityLabel: stringLabel.describe(
          'Required spoken description of the image.',
        ),
      })
      .required({ accessibilityLabel: true }),
    {
      label: 'The `accessibilityLabel` prop is required.',
      appearance:
        'Use `sources.light` and `sources.dark` for appearance-specific assets. The App requests images only through the Server asset route or image proxy; it never fetches a Plugin host directly.',
    },
  ),
  Video: wireParts.Video,
  Audio: wireParts.Audio,
  Label: wireParts.Label,
  Kbd: part(
    'A keyboard shortcut key or chord for desktop and web.',
    z.object({
      keys: z.array(z.string()).min(1).describe('Keys in the shortcut.'),
    }),
    {
      label: 'The displayed key names are the accessible name.',
      accessibility: accessibility.kbdAccessibility,
    },
  ),
  Avatar: part(
    'An image or initials with a size and optional status mark.',
    avatarProps,
    {
      label: 'The required accessibilityLabel supplies the spoken identity.',
      accessibility: accessibility.avatarAccessibility,
    },
  ),
  Markdown: wireParts.Markdown,
  Code: wireParts.Code,
  Link: wireParts.Link,
};
