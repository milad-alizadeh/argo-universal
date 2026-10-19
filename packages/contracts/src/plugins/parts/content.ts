import { z } from 'zod';
import * as accessibility from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
  onPress,
  imageSource,
} from '../plugin-part-schema-utils';
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
      previous: [
        z.object({
          name: z.string().describe('A supported native symbol name.'),
          role: z.string().optional().describe('Semantic icon size role.'),
          tone,
          status: z.string().optional().describe('Optional status mark.'),
          accessibilityLabel: optionalLabel,
        }),
      ],
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
  Video: part(
    'A stock video player whose source is served through the Server.',
    z.object({
      source: imageSource.describe(
        'Video URL or Plugin asset routed through the Server.',
      ),
      accessibilityLabel: stringLabel,
      controls: z
        .boolean()
        .optional()
        .describe('Show native playback controls.'),
    }),
    { label: 'The required `accessibilityLabel` names the video.' },
  ),
  Audio: part(
    'Audio with an Argo transport row, scrubber, and elapsed time.',
    z.object({
      source: imageSource.describe(
        'Audio URL or Plugin asset routed through the Server.',
      ),
      accessibilityLabel: stringLabel,
    }),
    { label: 'The required `accessibilityLabel` names the audio.' },
  ),
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
      previous: [
        z.object({
          source: imageSource.optional(),
          initials: z.string().optional().describe('Fallback initials.'),
          size: z.enum(['sm', 'md', 'lg']).optional().describe('Avatar size.'),
          status: z.string().optional().describe('Optional status mark.'),
          accessibilityLabel: optionalLabel,
        }),
      ],
    },
  ),
  Markdown: part(
    'Markdown content rendered with Argo typography and link behavior.',
    z.object({ source: z.string().describe('Markdown source text.') }),
    {
      label: 'The rendered content supplies its accessible text.',
      accessibility: accessibility.markdownAccessibility,
    },
  ),
  Code: part(
    'A monospaced code block with a copy action.',
    z.object({
      code: z.string().describe('Code displayed in the block.'),
      language: z.string().optional().describe('Optional language name.'),
    }),
    {
      label:
        'The code text is exposed to assistive technology; the copy control has the name “Copy code”.',
    },
  ),
  Link: part(
    'Text that opens a URL or an Argo route.',
    z.object({
      label: stringLabel,
      href: z.string().describe('URL or Argo route.'),
      onPress: onPress.optional(),
    }),
    {
      events: { onPress: z.undefined() },
      accessibility: accessibility.linkAccessibility,
    },
  ),
};
