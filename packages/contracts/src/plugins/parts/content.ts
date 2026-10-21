import { z } from 'zod';
import * as accessibility from '../part-accessibility-metadata';
import { part } from '../plugin-part-schema-utils';
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
  Markdown: wireParts.Markdown,
  Code: wireParts.Code,
  Link: wireParts.Link,
};
