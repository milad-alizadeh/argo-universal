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
 * The filter at the top of a Combobox's results. A narrow window, phone or web, raises the results in a
 * sheet and draws a muted pill, as each platform's sheet search looks; a wide one opens a popover and
 * draws a borderless row on the popover's own surface. Header and list search is SearchField, never this.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-3 rounded-full bg-muted px-4',
        'android:gap-2 android:px-2',
        'wide:h-8 wide:gap-1.5 wide:bg-transparent wide:px-2',
        props.className,
      )}
    >
      <Icon
        name="search"
        size="sm"
        className="text-foreground wide:text-muted-foreground"
      />
      <TextInput
        accessibilityLabel={props.label}
        placeholder={props.placeholder}
        placeholderTextColorClassName="accent-muted-foreground"
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        className="type-body ios:text-[17px] ios:leading-[22px] min-w-0 flex-1 py-0 text-foreground web:outline-none"
      />
    </View>
  );
}
