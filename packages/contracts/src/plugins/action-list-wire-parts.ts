import { z } from 'zod';
import {
  actionListProps,
  actionProps,
  actionSectionProps,
} from './action-list-props';
import { part } from './plugin-part-schema-utils';

export const actionListWireParts = {
  ActionList: {
    ...part('Actions offered by a page, row or tile.', actionListProps, {
      children: true,
      slots: { trigger: ['ListItem', 'Text', 'Stack'] },
      label:
        'Action labels name buttons; accessibilityLabel names the overflow menu.',
      accessibility: {
        keyboard:
          'Right-click or Shift+F10 opens a row menu. Arrow keys move, Enter activates, Escape closes. Shortcuts use first-declared-wins within the screen; Plugins cannot use Argo reserved keys.',
      },
    }),
    appProps: actionListProps.transform((props) => ({
      ...props,
      plugin: true,
    })),
  },
  'ActionList.Section': part('A group of Actions.', actionSectionProps, {
    children: true,
  }),
  Action: part('One Action declared inside ActionList.', actionProps, {
    // A press sends pending edits first, so a confirming Action acts on what the user typed.
    events: { onPress: z.undefined().meta({ flush: true }) },
  }),
};
