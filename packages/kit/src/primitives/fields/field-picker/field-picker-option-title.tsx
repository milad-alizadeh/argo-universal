import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldPickerOption } from './field-picker-model';

// An option's title with its icon or logo and tone, as every inline row draws it.
export const OptionTitle = ({
  option,
}: {
  option: FieldPickerOption;
}): ReactElement => (
  <RowTitle
    title={option.label}
    leading={option.icon}
    logo={option.logo}
    tone={option.tone}
  />
);
