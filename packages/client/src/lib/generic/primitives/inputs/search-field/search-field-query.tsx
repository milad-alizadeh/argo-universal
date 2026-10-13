import type * as React from 'react';
import type { Ref } from 'react';
import { TextInput } from 'react-native';

interface QueryInputProps {
  ref: Ref<TextInput>;
  editable: boolean;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onEscape: () => void;
}

const queryInputDefaults: React.ComponentProps<typeof TextInput> = {
  placeholderTextColorClassName: 'accent-muted-foreground',
  autoCapitalize: 'none',
  autoCorrect: false,
  className:
    'type-body ios:leading-none h-full web:h-10 w-full py-0 pl-9 pr-11 text-foreground web:outline-none',
  style: { textAlignVertical: 'center' },
};

// A bare input on the muted surface: search must not look like a form field.
export function QueryInput({
  ref,
  ...props
}: QueryInputProps): React.JSX.Element {
  return (
    <TextInput ref={ref} {...queryInputProps(props)} {...queryInputDefaults} />
  );
}

function queryInputProps(
  props: Omit<QueryInputProps, 'ref'>,
): React.ComponentProps<typeof TextInput> {
  return {
    editable: props.editable,
    accessibilityLabel: props.label,
    placeholder: props.label,
    value: props.value,
    onChangeText: props.onChangeText,
    onKeyPress: escapeHandler(props.onEscape),
  };
}

function escapeHandler(
  onEscape: () => void,
): NonNullable<React.ComponentProps<typeof TextInput>['onKeyPress']> {
  return ({ nativeEvent }) => {
    if (nativeEvent.key === 'Escape') onEscape();
  };
}
