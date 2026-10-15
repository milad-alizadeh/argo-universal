import type * as React from 'react';
import { Platform } from 'react-native';
import { errorMessage } from '#primitives/fields/field-errors';
import { useWide } from '../../../use-wide/use-wide';
import { InlineField, StackedField } from './text-input-native-parts';
import type { TextFieldProps } from './text-input-props';
import { RowTextInput as WideRowTextInput } from './text-input-row.tsx';

// iOS draws a stock Form row, its fill, insets and separator the system's; Android a bare field that says its own error or hint.
export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  if (useWide()) return <WideRowTextInput {...props} />;

  if (Platform.OS === 'ios')
    return <InlineField {...props} rowModifiers={[]} />;

  return <StackedField {...props} line={supportingLine(props)} />;
}

const supportingLine = (props: TextFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

RowTextInput satisfies React.ComponentType<TextFieldProps>;
