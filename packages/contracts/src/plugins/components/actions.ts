import { z } from 'zod';
import { actionEntryProps, actionSectionProps } from '../action-props';
import { buttonProps } from '../core-kit-props';
import { defineKitComponent } from '../define-kit-component';
import { iconButtonProps } from '../presentation-kit-props';
import { menuEvents, splitButtonSchema } from '../selection-schemas';

// A press sends pending edits first, so a confirming Button or Action acts on what the user typed.
const flushingPress = { onPress: z.undefined().meta({ flush: true }) };

export const actionsComponents = {
  'Action.Section': defineKitComponent(
    'A group of Actions.',
    actionSectionProps,
    {
      group: 'actions',
      children: true,
    },
  ),
  Action: defineKitComponent(
    'One Action in a Screen header, a row or tile menu, a SplitButton or an Alert: it runs on press, or opens a submenu of keyed Action.Section children.',
    actionEntryProps,
    {
      group: 'actions',
      // Only a submenu holds children; a press Action's are ignored.
      children: ['Action.Section'],
      container: false,
      events: flushingPress,
      label: 'Action labels name buttons and menu rows.',
      accessibility: {
        keyboard:
          'Right-click or Shift+F10 opens a row menu. Arrow keys move, Enter activates, Escape closes. Shortcuts use first-declared-wins within the screen; Plugins cannot use Argo reserved keys.',
      },
    },
  ),
  SplitButton: defineKitComponent(
    'A primary action with a secondary action menu.',
    splitButtonSchema,
    { group: 'actions', children: true, events: menuEvents },
  ),
  IconButton: defineKitComponent('An icon-only button.', iconButtonProps, {
    group: 'actions',
    events: { onPress: z.undefined() },
    label: 'The required `accessibilityLabel` is the button name.',
  }),
  Button: defineKitComponent(
    'An actionable control with Argo variants, sizes, and an optional activation handler.',
    buttonProps,
    {
      group: 'actions',
      events: flushingPress,
      accessibility: {
        label: 'The required `label` is also the accessible name.',
        keyboard:
          'Follows the platform button focus order. On web, Enter and Space activate the focused button.',
        voiceOver:
          'Exposes a button, reads its label, and reports the disabled state.',
      },
      appearance:
        '`variant` selects an Argo treatment that adapts to light and dark appearance. This kit component has no arbitrary `color` or Image prop.',
    },
  ),
};
