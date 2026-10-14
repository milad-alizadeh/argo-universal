import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '#primitives/display/icon';

type ComboboxSearchProps = {
  // Names the field, such as "Search Project".
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  // Enter chooses the active match.
  onSubmit: () => void;
};

/*
 * The filter at the top of a Combobox's options: a borderless muted field. Header and list search
 * is SearchField, never this.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <View className="h-10 flex-row items-center gap-2 rounded-xl bg-muted px-3">
      <Icon name="search" role="control" tone="muted" />
      <TextInput {...searchInputProps(props)} />
    </View>
  );
}

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
