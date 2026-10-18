import { z } from 'zod';
import { actionProps } from './action-list-props';
import { textUi } from './part-ui';
import { handler, part, stringLabel } from './plugin-part-schema-utils';

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
  onChangeText: handler('onChangeText')
    .optional()
    .describe('Receive the search query when it changes.'),
  primaryAction: actionProps
    .optional()
    .describe(
      'The main Action: a header button, iOS toolbar item, or Android FAB.',
    ),
});

export const pageWirePart = part(
  'A page with a title, header Actions, optional search, and content.',
  pageProps,
  {
    ui: textUi,
    children: true,
    slots: { actions: ['ActionList'] },
    events: { onChangeText: z.string(), onPress: z.undefined() },
  },
);
