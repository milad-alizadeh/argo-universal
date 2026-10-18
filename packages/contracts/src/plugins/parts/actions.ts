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
  ButtonGroup: part(
    'A horizontal or vertical group of buttons.',
    buttonGroupProps,
    {
      children: true,
      slots: {},
      previous: [
        z.object({ direction: z.enum(['horizontal', 'vertical']).optional() }),
      ],
    },
  ),
  SplitButton: selectionPartSchemas.SplitButton,
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
    {
      label: 'Each action uses its required label as its accessible name.',
      accessibility: {
        keyboard:
          'Arrow keys move through actions; Enter activates the focused action and Escape closes the menu.',
        voiceOver:
          'VoiceOver exposes a menu and announces each action label and its shortcut when one is supplied.',
        talkBack:
          'TalkBack exposes a menu and announces each action label and its shortcut when one is supplied.',
      },
    },
  ),
};
