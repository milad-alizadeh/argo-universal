import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../symbols/icon';
import { cn } from '../utils';

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
 * The filter at the top of a Combobox's results. A popover draws it borderless on the popover's own
 * surface; a phone sheet draws a muted pill, as each platform's sheet search looks.
 * Header and list search is SearchField, never this.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <View
      className={cn(
        'h-8 flex-row items-center gap-1.5 rounded-full px-2',
        'ios:h-12 ios:gap-3 ios:bg-muted ios:px-4',
        'android:h-12 android:gap-2 android:bg-muted android:px-2',
        props.className,
      )}
    >
      <Icon
        name="search"
        size="sm"
        className="text-muted-foreground native:text-foreground"
      />
      <TextInput
        accessibilityLabel={props.label}
        placeholder={props.placeholder}
        placeholderTextColorClassName="accent-muted-foreground"
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        className="type-control native:type-body ios:text-[17px] ios:leading-[22px] min-w-0 flex-1 py-0 text-foreground web:outline-none"
      />
    </View>
  );
}
