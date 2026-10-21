import type * as React from 'react';
import { Host } from '#primitives/native/host';
import { PhoneField } from './text-input-phone-field';
import type { PhoneFieldProps } from './text-input-props';

// The native field in its list row at every size class; in a stacked list it draws the row's cell.
export function RowTextInput(props: PhoneFieldProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
      <PhoneField {...props} />
    </Host>
  );
}

RowTextInput satisfies React.ComponentType<PhoneFieldProps>;
