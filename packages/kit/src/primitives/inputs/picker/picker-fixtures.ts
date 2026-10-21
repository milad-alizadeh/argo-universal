import type { SinglePickerProps } from './picker-props';

type PickerFixture = Omit<SinglePickerProps<string>, 'onValueChange'>;

const label = 'Effort';

const options = [
  { value: 'low', label: 'Low' },
  {
    value: 'medium',
    label: 'Medium',
    subtitle: 'A balanced amount of reasoning',
  },
  { value: 'high', label: 'High' },
] as const;

const longOptions = [
  ...options,
  {
    value: 'maximum',
    label:
      'Maximum reasoning for a complex implementation with several linked changes',
    subtitle: 'Uses more time and more of your plan',
  },
  { value: 'legacy', label: 'Legacy', disabled: true },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'quick', label: 'Quick' },
  { value: 'automatic', label: 'Automatic' },
] as const;

export const placeholderPicker = { label, options } satisfies PickerFixture;

export const selectedPicker = {
  label,
  options,
  value: 'medium',
} satisfies PickerFixture;

export const requiredWithErrorPicker = {
  label,
  options,
  required: true,
  errors: [{ message: 'Choose an effort' }],
} satisfies PickerFixture;

export const disabledPicker = {
  label,
  options,
  value: 'medium',
  disabled: true,
} satisfies PickerFixture;

export const loadingOptionsPicker = {
  label,
  options,
  loading: true,
} satisfies PickerFixture;

export const noOptionsPicker = { label, options: [] } satisfies PickerFixture;

export const optionsUnavailablePicker = {
  label,
  options,
  loadError: 'Could not load options',
} satisfies PickerFixture;

export const previousChoiceUnavailablePicker = {
  label,
  options,
  value: 'removed',
} satisfies PickerFixture;

export const searchableListPicker = {
  label,
  options: longOptions,
} satisfies PickerFixture;
