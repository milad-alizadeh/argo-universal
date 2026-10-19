import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part, stringLabel } from './plugin-part-schema-utils';
import { WireEvent } from './wire';

export const pageProps = z.object({
  title: stringLabel.describe('The single-line page title.'),
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

const pageReader =
  'Announces the title as the screen title, then the search field and header Actions, then the content.';

export const pageWirePart = part(
  'A page with a title, header Actions, a primary Action, optional search, and content.',
  pageProps,
  {
    children: true,
    root: true,
    slots: {
      actions: ['ActionList'],
      // The main Action: a header button, iOS toolbar item, or Android FAB.
      primaryAction: ['Action'],
    },
    // Typed search echoes at once and coalesces, and never holds the page.
    events: {
      onChangeText: echoes(pageProps, 'value', {
        throttleMs: 150,
        blocks: false,
      }),
    },
    accessibility: {
      label: 'The required `title` names the screen.',
      keyboard:
        'The page is not focusable. Its search field, header Actions and primary Action use their standard keyboard behavior; typing in search dispatches onChangeText.',
      voiceOver: pageReader,
      talkBack: pageReader,
    },
  },
);
