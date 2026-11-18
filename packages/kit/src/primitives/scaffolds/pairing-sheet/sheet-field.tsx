import type * as React from 'react';
import { TextInput, View } from 'react-native';
import { Text } from '#primitives/content/text';

export interface SheetFieldProps {
  value: string;
  placeholder: string;
  // What it asks for, under the field.
  hint: string;
  onChangeText: (value: string) => void;
}

const input = 'type-body h-13 rounded-2xl bg-muted px-4 text-foreground';

/*
 * The grey field a pairing sheet takes an address in, with what it wants said under it.
 */
export function SheetField(props: SheetFieldProps): React.JSX.Element {
  return (
    <View className="gap-2">
      <AddressInput {...props} />
      <Text role="badge" tone="muted" className="px-1">
        {props.hint}
      </Text>
    </View>
  );
}

const AddressInput = (props: SheetFieldProps): React.JSX.Element => (
  <TextInput
    accessibilityLabel="Address"
    keyboardType="url"
    autoCapitalize="none"
    autoCorrect={false}
    className={input}
    placeholderTextColorClassName="accent-tertiary"
    placeholder={props.placeholder}
    value={props.value}
    onChangeText={props.onChangeText}
  />
);
