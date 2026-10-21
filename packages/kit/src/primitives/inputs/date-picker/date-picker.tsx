import type { ComponentType, ReactElement } from 'react';
import { ListItemFieldRow } from '#primitives/lists/list-item';
import type { DatePickerProps } from './date-picker-props';
import { DateRowControl } from './date-row-control';

// iOS and desktop: a grouped field row, the label leading and the stock picker after it (ADR-0033).
export function DatePicker(props: DatePickerProps): ReactElement {
  return (
    <ListItemFieldRow {...props}>
      <DateRowControl {...props} />
    </ListItemFieldRow>
  );
}

DatePicker satisfies ComponentType<DatePickerProps>;
