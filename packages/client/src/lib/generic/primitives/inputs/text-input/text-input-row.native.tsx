import { frame, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { errorMessage } from '#primitives/fields/field-errors';
import { useWide } from '../../../use-wide/use-wide';
import { InlineField, StackedField } from './text-input-native-parts';
import type { TextFieldProps } from './text-input-props';
import { RowTextInput as WideRowTextInput } from './text-input-row.tsx';

const inset = 16;

// An iOS Settings form row's height and insets.
const formRow = [
  listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
  frame({ minHeight: 52 }),
];

// iOS draws a Settings form row; Android a bare field that says its own error or hint.
export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  if (useWide()) return <WideRowTextInput {...props} />;

  if (Platform.OS === 'ios')
    return <InlineField {...props} rowModifiers={formRow} />;

  return <StackedField {...props} line={supportingLine(props)} />;
}

const supportingLine = (props: TextFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

RowTextInput satisfies React.ComponentType<TextFieldProps>;
