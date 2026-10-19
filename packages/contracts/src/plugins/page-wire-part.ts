import { z } from 'zod';
import { actionProps } from './action-list-props';
import { part, stringLabel } from './plugin-part-schema-utils';
import { WireEvent } from './wire';

export const pageProps = z.object({
  title: stringLabel.describe('The single-line page title.'),
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
  // A Plugin event only: an App Action here would run on every keystroke, unthrottled.
  onChangeText: WireEvent.extend({ $event: z.literal('onChangeText') })
    .optional()
    .describe('Receive the search query when it changes.'),
  primaryAction: actionProps
    .optional()
    .describe(
      'The main Action: a header button, iOS toolbar item, or Android FAB.',
    ),
});

const pageReader =
  'Announces the title as the screen title, then the search field and header Actions, then the content.';

export const pageWirePart = part(
  'A page with a title, header Actions, optional search, and content.',
  pageProps,
  {
    children: true,
    root: true,
    slots: { actions: ['ActionList'] },
    events: {
      onChangeText: z.string().meta({ throttleMs: 150 }),
      onPress: z.undefined(),
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
