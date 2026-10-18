import { z } from 'zod';
import { buttonProps } from '../kit-props';
import { part, stringLabel, onPress } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

const catalogButtonProps = buttonProps.extend({
  icon: z.string().optional().describe('Optional native symbol name.'),
});

export const actionsPartSchemas = {
  Button: {
    ...wireParts.Button,
    props: catalogButtonProps,
    versions: [catalogButtonProps],
  },
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
    {
      events: { onPress: z.undefined() },
      accessibility: {
        keyboard:
          'Keyboard focus reaches the primary action first. Enter or Space runs it; the adjacent menu control opens the secondary actions.',
        voiceOver:
          'VoiceOver exposes the primary action and secondary menu as separate controls, each with its own action label.',
        talkBack:
          'TalkBack exposes the primary action and secondary menu as separate controls, each with its own action label.',
      },
    },
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
