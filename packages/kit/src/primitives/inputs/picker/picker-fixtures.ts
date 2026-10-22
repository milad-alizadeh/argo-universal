import type { MultiplePickerProps, SinglePickerProps } from './picker-props';

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

export const previousChoiceUnavailablePicker = {
  label,
  options,
  value: 'removed',
} satisfies PickerFixture;

export const searchableListPicker = {
  label,
  options: longOptions,
} satisfies PickerFixture;

export const rowPicker = {
  label,
  options,
  value: 'medium',
  variant: 'row',
} satisfies PickerFixture;

type MultiplePickerFixture = Omit<MultiplePickerProps<string>, 'onValueChange'>;

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
  { value: 'chore', label: 'Chore' },
] as const;

const multiple = {
  label: 'Labels',
  placeholder: 'Choose labels',
  options: labels,
  multiple: true,
} as const;

export const multipleNoneSelectedPicker = {
  ...multiple,
} satisfies MultiplePickerFixture;

export const multipleOneSelectedPicker = {
  ...multiple,
  value: ['bug'],
} satisfies MultiplePickerFixture;

export const multipleSeveralSelectedPicker = {
  ...multiple,
  value: ['bug', 'feature', 'docs'],
} satisfies MultiplePickerFixture;

export const multipleDisabledPicker = {
  ...multiple,
  value: ['bug', 'feature'],
  disabled: true,
} satisfies MultiplePickerFixture;

export const multipleLoadingOptionsPicker = {
  ...multiple,
  loading: true,
} satisfies MultiplePickerFixture;

export const multipleNoOptionsPicker = {
  ...multiple,
  options: [],
} satisfies MultiplePickerFixture;

export const multipleOptionsUnavailablePicker = {
  ...multiple,
  loadError: 'Could not load labels',
} satisfies MultiplePickerFixture;

export const multiplePreviousChoiceUnavailablePicker = {
  ...multiple,
  value: ['removed'],
} satisfies MultiplePickerFixture;

export const multipleInvalidPicker = {
  ...multiple,
  required: true,
  errors: [{ message: 'Choose at least one label.' }],
} satisfies MultiplePickerFixture;
