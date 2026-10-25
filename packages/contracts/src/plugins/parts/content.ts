import { z } from 'zod';
import { part } from '../plugin-part-schema-utils';

export const contentPartSchemas = {
  Kbd: part(
    'A keyboard shortcut key or chord for desktop and web.',
    z.object({
      keys: z.array(z.string()).min(1).describe('Keys in the shortcut.'),
    }),
    {
      group: 'content',
      wire: false,
      label: 'The displayed key names are the accessible name.',
      accessibility: {
        keyboard:
          'Kbd is a static shortcut hint and does not enter the focus order or activate the shortcut.',
        voiceOver:
          'VoiceOver reads the displayed key names as a shortcut hint; it does not activate them.',
        talkBack:
          'TalkBack reads the displayed key names as a shortcut hint; it does not activate them.',
      },
    },
  ),
};
