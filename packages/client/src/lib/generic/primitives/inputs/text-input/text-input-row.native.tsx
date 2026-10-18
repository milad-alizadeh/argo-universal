import type * as React from 'react';
import { StackedCell } from '#primitives/lists/grouped-list-item';
import { PhoneField } from './text-input-phone-field';
import type { PhoneFieldProps } from './text-input-props';

// The native field in its list row at every size class; in a stacked list it draws the row's cell.
export function RowTextInput(props: PhoneFieldProps): React.JSX.Element {
  return (
    <StackedCell>
      <PhoneField {...props} />
    </StackedCell>
  );
}

RowTextInput satisfies React.ComponentType<PhoneFieldProps>;
