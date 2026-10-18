import type * as React from 'react';
import { PhoneField } from './text-input-phone-field';
import type { PhoneFieldProps } from './text-input-props';

// The native field in its list row at every size class.
export function RowTextInput(props: PhoneFieldProps): React.JSX.Element {
  return <PhoneField {...props} />;
}

RowTextInput satisfies React.ComponentType<PhoneFieldProps>;
