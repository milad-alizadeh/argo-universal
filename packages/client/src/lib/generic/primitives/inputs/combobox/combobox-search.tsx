import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { cn } from '../../../utils';
import type { ComboboxSearchProps } from './combobox-search-props';

/*
 * The shared React Native filter for Combobox results on every platform (owner, 2026-10-15).
 * Header and list search is SearchField; this input belongs to a choice list.
 * Card on the phone Sheet's content fill; muted inside the wide Popover's card.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <View className={containerClasses(props.className)}>
      <Icon
        name="search"
        role="control"
        className="text-foreground wide:text-muted-foreground"
      />
      <SearchInput {...props} />
    </View>
  );
}

const containerClasses = (className: string | undefined): string =>
  cn(
    'h-12 flex-row items-center gap-3 rounded-full bg-card px-4',
    'wide:h-8 wide:gap-2 wide:rounded-control wide:bg-muted wide:px-2.5',
    className,
  );

function SearchInput(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <TextInput
      role="searchbox"
      accessibilityLabel={props.label}
      placeholder={props.placeholder}
      placeholderTextColorClassName="accent-muted-foreground"
      value={props.value}
      onChangeText={props.onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      className="type-body ios:type-nav-action min-w-0 flex-1 py-0 text-foreground web:outline-none"
    />
  );
}
