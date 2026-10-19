import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { pressHandler } from './kit-event-props';
import { rowBadgeProps } from './status-kit-props';

export const shortcutProps = z.object({
  modifiers: z
    .array(z.enum(['meta', 'ctrl', 'alt', 'shift']))
    .readonly()
    .describe('Required keyboard modifiers.'),
  key: z.string().min(1).describe('KeyboardEvent.key, such as Enter or c.'),
});

// An Alert answer has no icon; UIAlertAction.Style and Raycast's Alert.ActionStyle mark its role.
export const actionProps = z.object({
  label: z.string().min(1).describe('The Action label and accessible name.'),
  icon: iconName
    .optional()
    .describe(
      'The leading Argo icon; a header ActionList shows only Actions with one as buttons.',
    ),
  shortcut: shortcutProps
    .optional()
    .describe('Desktop shortcut; Plugins cannot take reserved keys.'),
  tone: z
    .literal('danger')
    .optional()
    .describe('Destructive Actions appear last in their own Section.'),
  disabled: z
    .boolean()
    .optional()
    .describe('Disable activation without hiding the Action.'),
  onPress: pressHandler.describe('The Plugin handler or built-in App Action.'),
  role: z
    .enum(['cancel', 'destructive'])
    .optional()
    .describe(
      'An Alert answer that dismisses the question, or one that destroys data.',
    ),
});

// An Action that opens a menu of its own: its keyed ActionList.Section children hold the entries, and a full header folds it into the overflow menu as a nested menu.
export const submenuActionProps = z.object({
  label: actionProps.shape.label,
  icon: iconName.describe(
    'The leading Argo icon; a header ActionList shows only Actions with one as buttons, and a submenu needs one.',
  ),
  badge: rowBadgeProps
    .optional()
    .describe('A count or status dot on the icon.'),
});

// A press Action that can be its Section's chosen option, as a filter's: the check marks it, as UIMenu's state and Material's trailing check do.
export const choiceActionProps = actionProps.extend({
  selected: z
    .boolean()
    .optional()
    .describe(
      "Check this Action as its Section's chosen option; pass false on the others.",
    ),
});

// An Action runs on press or opens a submenu; only a press Action has `onPress`.
export const actionEntryProps = z.union([
  choiceActionProps,
  submenuActionProps,
]);

export const actionListProps = z.object({
  variant: z
    .enum(['header', 'context'])
    .optional()
    .describe('Header buttons and overflow, or a row context menu.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken overflow menu name.'),
});

export const actionSectionProps = z.object({
  title: z.string().optional().describe('Optional Section heading.'),
});
