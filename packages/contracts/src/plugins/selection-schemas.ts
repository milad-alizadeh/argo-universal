import { z } from 'zod';
import { iconName } from '../kit-symbols/icon-schema';
import { handler } from './plugin-part-props';
import { selectionValue } from './selection-value';

const disabledDescription = 'Disable activation.';

export const menuAction = z.object({
  label: z.string().describe('Action label.'),
  onPress: handler('onPress').describe('Action to run.'),
  icon: iconName.optional().describe('Leading icon.'),
  selected: z.boolean().optional().describe('Mark the current action.'),
  disabled: z.boolean().optional().describe(disabledDescription),
});

export const selectionOption = z.object({
  value: selectionValue,
  label: z.string(),
  disabled: z.boolean().optional(),
  subtitle: z.string().optional(),
});

export const pickerSchema = z.object({
  label: z.string().describe('Spoken and visible selection name.'),
  value: selectionValue.optional().describe('Selected value.'),
  options: z.array(selectionOption).readonly().describe('Available choices.'),
  onValueChange: handler('onValueChange').describe('Reports a selected value.'),
  required: z.boolean().optional().describe('A value is required.'),
  placeholder: z
    .string()
    .optional()
    .describe('Text shown without a selection.'),
  disabled: z.boolean().optional().describe('Disable selection.'),
  loading: z.boolean().optional().describe('Choices are loading.'),
  loadError: z.string().optional().describe('Why choices failed to load.'),
  variant: z.enum(['row', 'field']).optional().describe('Selection placement.'),
});

const comboboxOption = selectionOption.extend({
  accessibilityLabel: z.string().optional(),
  code: z.boolean().optional(),
  icon: iconName.optional(),
});

export const comboboxSchema = pickerSchema.extend({
  options: z.array(comboboxOption).readonly().describe('Searchable choices.'),
  title: z.string().optional().describe('Overlay heading.'),
  searchPlaceholder: z.string().optional().describe('Search hint.'),
  emptyLabel: z.string().optional().describe('Empty result message.'),
  footerAction: z
    .object({ label: z.string(), onPress: handler('onPress') })
    .optional()
    .describe('Action below the choices.'),
});

export const menuOption = selectionOption
  .omit({ subtitle: true })
  .extend({ icon: iconName.optional() });

export const menuChoice = z.object({
  value: selectionValue,
  options: z.array(menuOption).readonly(),
  onValueChange: handler('onValueChange'),
  actions: z.never().optional(),
  groups: z.never().optional(),
});

export const actionMenu = z.object({
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
  align: z.enum(['start', 'end']).optional().describe('Web alignment.'),
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
  size: z.enum(['sm', 'xs']).optional().describe('Split size.'),
  fullWidth: z
    .union([z.boolean(), z.literal('narrow')])
    .optional()
    .describe('Fill the row always, or only when narrow.'),
});

const splitChoices = menuChoice.omit({ groups: true }).extend({
  options: z
    .array(selectionOption.pick({ value: true, label: true }))
    .readonly(),
});

export const splitButtonSchema = z.union([
  splitBase.extend(splitChoices.shape),
  splitBase.extend(actionMenu.omit({ groups: true }).shape),
]);
