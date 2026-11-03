import { z } from 'zod';
import { fieldGroupLinkRowProps } from './field-group-row-props';
import { fieldLinkMark } from './field-link-mark-props';
import { handler } from './kit-component-props';

export const fieldGroupLinkProps = fieldGroupLinkRowProps.extend({
  leadingMark: fieldLinkMark
    .optional()
    .describe('A leading symbol with an optional status indicator.'),
  titleTone: z
    .enum(['neutral', 'muted'])
    .optional()
    .describe('The title emphasis.'),
  subtitle: z
    .string()
    .optional()
    .describe('A supporting line under the title.'),
  subtitleTone: z
    .enum(['muted', 'danger'])
    .optional()
    .describe('The supporting text tone.'),
  value: z
    .string()
    .optional()
    .describe(
      'What the page it opens holds, such as a count: before the chevron on iOS and the web, under the title on Android.',
    ),
  onPress: handler('onPress'),
});
