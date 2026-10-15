import type * as React from 'react';
import { errorMessage } from '#primitives/fields/field-errors';
import { useWide } from '../../../use-wide/use-wide';
import { PhoneField } from './text-input-phone-field';
import type { TextFieldProps } from './text-input-props';
import { RowTextInput as WideRowTextInput } from './text-input-row.tsx';

// iOS draws a Settings form row; Android a stacked Material field that says its own error or hint.
export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  if (useWide()) return <WideRowTextInput {...props} />;

  return <PhoneField {...props} supportingText={supportingLine(props)} />;
}

// The error in its place when there is one, else the hint.
const supportingLine = (props: TextFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

RowTextInput satisfies React.ComponentType<TextFieldProps>;
