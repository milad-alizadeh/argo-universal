import { z } from 'zod';
import { iconName, iconSymbol } from '../kit-symbols/icon-schema';
import { buttonDefaults, menuDefaults } from '../kit-tokens';
import { echoes, handler } from './kit-component-props';
import { selectionValue } from './selection-value';

const disabledDescription = 'Disable activation.';

const menuAction = z.object({
  label: z.string().describe('Action label.'),
  onPress: handler('onPress').describe('Action to run.'),
  icon: iconSymbol.optional().describe('Leading icon.'),
  selected: z.boolean().optional().describe('Mark the current action.'),
  disabled: z.boolean().optional().describe(disabledDescription),
});

const selectionOption = z.object({
  value: selectionValue,
  label: z.string(),
  disabled: z.boolean().optional(),
  subtitle: z.string().optional(),
});

const menuOption = selectionOption
  .omit({ subtitle: true })
  .extend({ icon: iconName.optional() });

const menuChoice = z.object({
  value: selectionValue,
  options: z.array(menuOption).readonly(),
  onValueChange: handler('onValueChange'),
  actions: z.never().optional(),
  groups: z.never().optional(),
});

const actionMenu = z.object({
  actions: z.array(menuAction).readonly(),
  value: z.never().optional(),
  options: z.never().optional(),
  onValueChange: z.never().optional(),
  groups: z.never().optional(),
});

const choiceGroup = menuChoice
  .omit({ actions: true, groups: true })
  .extend({ label: z.string().optional() });

const groupedMenu = actionMenu.omit({ actions: true, groups: true }).extend({
  groups: z.array(choiceGroup).readonly(),
  actions: z.never().optional(),
});

const menuBase = z.object({
  accessibilityLabel: z.string().describe('Spoken menu name.'),
  disabled: z.boolean().optional().describe(disabledDescription),
  align: z
    .enum(['start', 'end'])
    .optional()
    .meta({ default: menuDefaults.align })
    .describe('Web alignment.'),
  loading: z.boolean().optional().describe('Choices are loading.'),
});

export const menuSchema = z.union([
  menuBase.extend(menuChoice.shape),
  menuBase.extend(groupedMenu.shape),
  menuBase.extend(actionMenu.shape),
]);

const splitBase = z.object({
  label: z.string().describe('Primary action label.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Spoken primary action name.'),
  icon: iconName.optional().describe('Primary action icon.'),
  onPress: handler('onPress').optional().describe('Primary action.'),
  menuLabel: z.string().describe('Spoken secondary menu name.'),
  primary: z.boolean().optional().describe('Filled treatment.'),
  disabled: z.boolean().optional().describe(disabledDescription),
  size: z
    .enum(['xs', 'sm', 'md'])
    .optional()
    .meta({ default: buttonDefaults.size })
    .describe("Both segments' Button size; xs draws as sm."),
  fullWidth: z
    .union([z.boolean(), z.literal('narrow')])
    .optional()
    .describe('Fill the row always, or only when narrow.'),
});

// A draft SplitButton may leave `onValueChange` off: the App holds the draft.
const splitChoices = menuChoice.omit({ groups: true }).extend({
  options: z
    .array(selectionOption.pick({ value: true, label: true }))
    .readonly(),
  onValueChange: menuChoice.shape.onValueChange.optional(),
});

// Without choices, the secondary menu lists the SplitButton's keyed Action children.
const splitActionChildren = z.object({
  value: z.never().optional(),
  options: z.never().optional(),
  onValueChange: z.never().optional(),
});

export const splitButtonSchema = z.union([
  splitBase.extend(splitChoices.shape),
  splitBase.extend(splitActionChildren.shape),
]);

// A Menu and a SplitButton echo the chosen value and run a pressed action.
export const menuEvents = {
  onValueChange: echoes(menuChoice, 'value'),
  onPress: z.undefined(),
};
