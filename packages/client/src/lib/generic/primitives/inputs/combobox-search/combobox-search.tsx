import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../../../symbols/icon';
import { cn } from '../../../utils';

export interface ComboboxSearchProps {
  // Names the field, such as "Find a Project".
  label: string;
  // Shows while the field is empty, such as "Find a Project…".
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
}

/*
 * The filter at the top of a Combobox's results. Web draws a borderless muted list search field;
 * native sheets keep their platform search drawing. Header and list search is SearchField, never this.
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
    'h-12 flex-row items-center gap-3 rounded-full bg-muted px-4',
    'android:gap-2 android:px-2',
    'wide:h-8 wide:gap-1.5 wide:bg-transparent wide:px-2 web:rounded-2xl web:wide:h-10 web:wide:gap-3 web:wide:bg-muted web:wide:px-4',
    className,
  );

function SearchInput(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <TextInput
      accessibilityLabel={props.label}
      placeholder={props.placeholder}
      placeholderTextColorClassName="accent-muted-foreground"
      value={props.value}
      onChangeText={props.onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      className="type-body ios:text-nav-action ios:leading-nav-action min-w-0 flex-1 py-0 text-foreground web:outline-none"
    />
  );
}
