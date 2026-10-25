import { z } from 'zod';
import { actionEntryProps, actionSectionProps } from './action-props';
import { part } from './plugin-part-schema-utils';

export const actionWireParts = {
  'Action.Section': part('A group of Actions.', actionSectionProps, {
    children: true,
  }),
  Action: {
    ...part(
      'One Action in a Screen header, a row or tile menu, a SplitButton or an Alert: it runs on press, or opens a submenu of keyed Action.Section children.',
      actionEntryProps,
      {
        // Only a submenu holds children; a press Action's are ignored.
        children: ['Action.Section'],
        container: false,
        // A press sends pending edits first, so a confirming Action acts on what the user typed.
        events: { onPress: z.undefined().meta({ flush: true }) },
        label: 'Action labels name buttons and menu rows.',
        accessibility: {
          keyboard:
            'Right-click or Shift+F10 opens a row menu. Arrow keys move, Enter activates, Escape closes. Shortcuts use first-declared-wins within the screen; Plugins cannot use Argo reserved keys.',
        },
      },
    ),
    // The renderer marks Plugin Actions so they cannot claim reserved shortcuts.
    appProps: actionEntryProps.transform((props) => ({
      ...props,
      plugin: true,
    })),
  },
};
