import type { ReactElement } from 'react';
import type { OptionRowProps } from './field-picker-inline-choice';
import { OptionRow } from './field-picker-inline-row';
import type { FieldPickerProps } from './field-picker-model';

export type { OptionRowProps };

// The options of an `inline` picker as the rows of the section that holds it, each drawn by the platform's OptionRow.
export const inlineOptionRows = (props: FieldPickerProps): ReactElement[] =>
  props.options.map((option) => (
    <OptionRow key={option.value} {...props} option={option} />
  ));
