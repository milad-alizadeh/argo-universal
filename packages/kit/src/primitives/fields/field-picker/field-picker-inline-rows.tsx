import type { ReactElement } from 'react';
import type { OptionRowProps } from './field-picker-inline-choice';
import { OptionRow } from './field-picker-inline-row';
import type { FieldPickerProps } from './field-picker-model';

export type { OptionRowProps };

/*
 * The options of an `inline` picker as the rows of the section that holds it, each drawn by the platform's OptionRow.
 * The rows sit beside other pickers' rows, so each key names its picker as well as its option.
 */
export const inlineOptionRows = (props: FieldPickerProps): ReactElement[] =>
  props.options.map((option) => (
    <OptionRow
      key={`${props.title}:${option.value}`}
      {...props}
      option={option}
    />
  ));
