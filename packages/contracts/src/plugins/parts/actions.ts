import { z } from 'zod';
import { part, stringLabel, onPress } from '../plugin-part-schema-utils';
import { iconButtonProps } from '../presentation-kit-props';
import { selectionPartSchemas } from '../selection-parts';
import { buttonGroupProps } from '../simple-kit-props';
import { wireParts } from '../wire-parts';

export const actionsPartSchemas = {
  Button: wireParts.Button,
  IconButton: part('An icon-only button.', iconButtonProps, {
    events: { onPress: z.undefined() },
    label: 'The required `accessibilityLabel` is the button name.',
    previous: [
      z.object({
        icon: z.string().describe('Native symbol name.'),
        accessibilityLabel: stringLabel,
        disabled: z.boolean().optional(),
        onPress: onPress.optional(),
      }),
    ],
  }),
  ButtonGroup: part('A joined group of buttons.', buttonGroupProps, {
    children: true,
    slots: {},
    previous: [
      z.object({ direction: z.enum(['horizontal', 'vertical']).optional() }),
    ],
  }),
  SplitButton: selectionPartSchemas.SplitButton,
  ActionList: wireParts.ActionList,
  'ActionList.Section': wireParts['ActionList.Section'],
  Action: wireParts.Action,
};
