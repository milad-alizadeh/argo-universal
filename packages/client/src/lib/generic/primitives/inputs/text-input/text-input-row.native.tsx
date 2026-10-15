import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { PhoneField } from './text-input-phone-field';
import type { TextFieldProps } from './text-input-props';
import { RowTextInput as WideRowTextInput } from './text-input-row.tsx';

// iOS draws a Settings form row; Android a stacked Material field that says its own error or hint.
export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  if (useWide()) return <WideRowTextInput {...props} />;

  return <PhoneField {...props} />;
}

RowTextInput satisfies React.ComponentType<TextFieldProps>;
