import { z } from 'zod';
import { part, stringLabel, onPress } from '../plugin-part-schema-utils';

export const actionsPartSchemas = {
  IconButton: part(
    'An icon-only button.',
    z.object({
      icon: z.string().describe('Native symbol name.'),
      accessibilityLabel: stringLabel,
      disabled: z.boolean().optional(),
      onPress: onPress.optional(),
    }),
    {
      events: { onPress: z.undefined() },
      label: 'The required `accessibilityLabel` is the button name.',
    },
  ),
  ButtonGroup: part(
    'A horizontal or vertical group of buttons.',
    z.object({ direction: z.enum(['horizontal', 'vertical']).optional() }),
    {
      children: true,
      slots: { items: ['Button', 'IconButton', 'SplitButton'] },
    },
  ),
  SplitButton: part(
    'A primary action with a secondary action menu.',
    z.object({
      label: stringLabel,
      actions: z.array(z.object({ label: stringLabel, onPress })),
    }),
    { events: { onPress: z.undefined() } },
  ),
  ActionList: part(
    'Actions offered by a page, row, or tile.',
    z.object({
      actions: z.array(
        z.object({
          label: stringLabel,
          onPress,
          shortcut: z.array(z.string()).optional(),
        }),
      ),
    }),
    { label: 'Each action uses its required label as its accessible name.' },
  ),
};
