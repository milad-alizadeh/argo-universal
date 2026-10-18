import { z } from 'zod';
import { actionProps } from './action-list-props';
import { handler, part, stringLabel } from './plugin-part-schema-utils';

export const pageProps = z.object({
  title: stringLabel.describe('The single-line page title.'),
  search: z
    .object({
      label: stringLabel.describe('The search label and placeholder.'),
      value: z
        .string()
        .optional()
        .describe('The initial query; drafts stay in the App.'),
      onChangeText: handler('onChangeText')
        .optional()
        .describe('Receive the search query when it changes.'),
    })
    .optional()
    .describe('Native search on phones; expanding header search on web.'),
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
    children: true,
    slots: { actions: ['ActionList'] },
    events: { onChangeText: z.string(), onPress: z.undefined() },
  },
);
