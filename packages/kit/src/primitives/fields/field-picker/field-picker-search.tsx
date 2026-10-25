import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { cn } from '../../../utils';

type ScreenSearchFieldProps = {
  // Names the field, such as "Search Branch".
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
};

/*
 * The filter above a searchable page's rows on every platform: card on the phone Sheet's content fill, muted inside
 * the wide popover's card. Private to the picker; header and list search is SearchField.
 */
export function ScreenSearchField(
  props: ScreenSearchFieldProps,
): React.JSX.Element {
  return (
    <View className={containerClasses(props.className)}>
      <Icon
        name="search"
        className="text-foreground wide:text-muted-foreground"
      />
      <SearchInput {...props} />
    </View>
  );
}

const containerClasses = (className: string | undefined): string =>
  cn(
    'h-12 flex-row items-center gap-3 rounded-full bg-card px-4',
    'wide:h-8 wide:gap-2 wide:bg-muted wide:px-2',
    className,
  );

function SearchInput(props: ScreenSearchFieldProps): React.JSX.Element {
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
