import type { ComboboxContentProps } from './combobox-props';

type ComboboxContentFixture = Omit<
  ComboboxContentProps<string>,
  'onValueChange'
>;

const base = { label: 'Folders', options: [] } as const;

export const loadingComboboxContent = {
  ...base,
  loading: true,
} satisfies ComboboxContentFixture;

export const emptyComboboxContent = {
  ...base,
} satisfies ComboboxContentFixture;

export const couldNotLoadComboboxContent = {
  ...base,
  loadError: 'Folders could not be loaded.',
} satisfies ComboboxContentFixture;
