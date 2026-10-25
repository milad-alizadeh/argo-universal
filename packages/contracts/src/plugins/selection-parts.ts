import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import { menuChoice, menuSchema, splitButtonSchema } from './selection-schemas';

// A draft SplitButton may leave `onValueChange` off the wire: the App holds the draft.
const [withChoices, withActions] = splitButtonSchema.options;

const splitButtonDraft = z.union([
  withChoices.extend({
    onValueChange: withChoices.shape.onValueChange.optional(),
  }),
  withActions,
]);

const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};

export const selectionPartSchemas = {
  Menu: part('A choice or action menu.', menuSchema, {
    group: 'overlays',
    wire: false,
    events: menuEvents,
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      group: 'actions',
      wireProps: splitButtonDraft,
      children: true,
      events: menuEvents,
    },
  ),
};
