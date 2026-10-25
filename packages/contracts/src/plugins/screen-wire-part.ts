import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { actionSlot, part, stringLabel } from './plugin-part-schema-utils';
import { WireEvent } from './wire';

const screenProps = z.object({
  title: stringLabel.describe('The single-line screen title.'),
  caption: z
    .string()
    .optional()
    .describe('A muted line under the title on wide windows; phones hide it.'),
  search: z
    .object({
      label: stringLabel.describe('The search label and placeholder.'),
    })
    .optional()
    .describe('Native search on phones; expanding header search on web.'),
  value: z
    .string()
    .optional()
    .describe('The search query; drafts stay in the App.'),
  // A Plugin event only: an App Action here would run on every keystroke.
  onChangeText: WireEvent.extend({ $event: z.literal('onChangeText') })
    .optional()
    .describe('Receive the search query when it changes.'),
});

const screenReader =
  'Announces the title as the screen title, then the search field and header Actions, then the content.';

export const screenWirePart = part(
  'A screen with a title, header Actions, a primary Action, optional search, and content.',
  screenProps,
  {
    group: 'scaffolds',
    children: true,
    root: true,
    slots: {
      // The header's verbs, in Sections: buttons on wide screens and iOS, the toolbar and overflow menu on Android. Header Actions nested in content are not a header.
      actions: actionSlot,
      // The main Action: a header button, iOS toolbar item, or Android FAB.
      primaryAction: ['Action'],
    },
    // Typed search echoes at once and coalesces, and never holds the screen.
    events: {
      onChangeText: echoes(screenProps, 'value', {
        throttleMs: 150,
        blocks: false,
      }),
    },
    accessibility: {
      label: 'The required `title` names the screen.',
      keyboard:
        'The screen is not focusable. Its search field, header Actions and primary Action use their standard keyboard behavior; typing in search dispatches onChangeText.',
      voiceOver: screenReader,
      talkBack: screenReader,
    },
  },
);
