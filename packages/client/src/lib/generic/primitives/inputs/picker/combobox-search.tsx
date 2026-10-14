import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { cn } from '../../../utils';

type ComboboxSearchProps = {
  // Names the field, such as "Search Project".
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  // Enter chooses the active match.
  onSubmit: () => void;
  // A phone sheet's field, inset from the sheet's edges as the options below run edge to edge.
  phone?: boolean;
};

/*
 * The filter at the top of a Combobox's options: a borderless muted field. Header and list search
 * is SearchField, never this.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <View className={fieldClassName(props.phone)}>
      <Icon name="search" role="control" tone="muted" />
      <TextInput {...searchInputProps(props)} />
    </View>
  );
}

// Paper's phone field: 40pt on iOS, Material's 48dp on Android, both in the container radius.
const fieldClassName = (phone: boolean | undefined): string =>
  cn(
    'h-10 flex-row items-center gap-2 bg-muted px-3',
    phone
      ? 'mx-4 rounded-2xl android:h-12 android:gap-3 android:px-4'
      : 'rounded-xl',
  );

const searchInputAppearance = {
  placeholderTextColorClassName: 'accent-muted-foreground',
  autoCapitalize: 'none',
  autoCorrect: false,
  returnKeyType: 'done',
  className: 'type-body min-w-0 flex-1 py-0 text-foreground web:outline-none',
} as const;

function searchInputProps(
  props: ComboboxSearchProps,
): React.ComponentProps<typeof TextInput> {
  return {
    ...searchInputAppearance,
    accessibilityLabel: props.label,
    placeholder: props.placeholder,
    value: props.value,
    onChangeText: props.onChangeText,
    onSubmitEditing: props.onSubmit,
  };
}
