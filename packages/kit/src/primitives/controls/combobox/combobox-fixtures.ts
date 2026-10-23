import type { ComboboxProps } from './combobox-props';

const options = [
  {
    value: 'long',
    label: 'long-folder-name',
    // A long path shows how a path shortens before the selected check.
    subtitle:
      '~/Folder/very/long/path/to/some/nested/location/long-folder-name',
    code: true,
    icon: 'folder',
  },
  {
    value: 'paper',
    label: 'second-folder',
    subtitle: '~/Folder/second-folder',
    code: true,
    icon: 'folder',
  },
  {
    value: 'docs',
    label: 'third-folder',
    subtitle: '~/Folder/third-folder',
    code: true,
    icon: 'folder',
  },
] satisfies ComboboxProps<string>['options'];

export const defaultCombobox = {
  label: 'Folder',
  value: 'long',
  options,
  searchPlaceholder: 'Find a folder…',
} satisfies Omit<ComboboxProps<string>, 'onValueChange'>;

export const rowCombobox = {
  ...defaultCombobox,
  variant: 'row',
  title: 'Select folder',
} satisfies Omit<ComboboxProps<string>, 'onValueChange'>;
