import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { pressHandler } from './kit-event-props';

export const shortcutProps = z.object({
  modifiers: z
    .array(z.enum(['meta', 'ctrl', 'alt', 'shift']))
    .readonly()
    .describe('Required keyboard modifiers.'),
  key: z.string().min(1).describe('KeyboardEvent.key, such as Enter or c.'),
});

export const actionProps = z.object({
  label: z.string().min(1).describe('The Action label and accessible name.'),
  icon: iconName.describe('The leading Argo icon.'),
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
});

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
