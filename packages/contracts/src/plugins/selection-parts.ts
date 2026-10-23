import { z } from 'zod';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import { menuChoice, menuSchema, splitButtonSchema } from './selection-schemas';

const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};

export const selectionPartSchemas = {
  Menu: part('A choice or action menu.', menuSchema, {
    events: menuEvents,
  }),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    {
      children: true,
      events: menuEvents,
    },
  ),
};
