import { z } from 'zod';
import * as accessibility from '../part-accessibility-metadata';
import { part, stringLabel, onPress } from '../plugin-part-schema-utils';
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
  Image: wireParts.Image,
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
  Avatar: wireParts.Avatar,
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
