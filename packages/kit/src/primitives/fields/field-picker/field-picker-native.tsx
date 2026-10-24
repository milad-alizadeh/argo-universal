import type { ComponentType, ReactElement } from 'react';
import { FieldPickerDrill } from './field-picker-drill';
import {
  choiceSummary,
  chosenLogo,
  drawingProps,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';

export type NativeRowProps = Pick<
  FieldPickerProps,
  'title' | 'leading' | 'disabled'
> & {
  // The chosen option's logo, which the row leads with in place of `leading`.
  logo?: string;
  summary: string;
  onPress?: () => void;
};

type NativePickerProps = {
  caller: FieldPickerCallerProps | FieldPickerProps;
  // What a `menu` draws, in place of the row's page.
  menu: ComponentType<FieldPickerProps>;
  // The platform's row: it opens the page, or the menu.
  row: ComponentType<NativeRowProps>;
  // What an `inline` choice draws: the options as rows of the section that holds the picker.
  inline: ComponentType<FieldPickerProps>;
};

export const rowProps = (props: FieldPickerProps): NativeRowProps => ({
  title: props.title,
  leading: props.leading,
  logo: chosenLogo(props),
  summary: choiceSummary(props),
  disabled: props.disabled,
});

/*
 * The phones' picker, whatever the platform draws: a `menu` opens in place, an `inline` choice is rows of its section, a `page` always opens its page, pushed on
 * the stack that holds the row (ADR-0042). It never changes with its parent.
 */
export function NativePicker(props: NativePickerProps): ReactElement {
  const picker = drawingProps(props.caller);

  if (picker.presentation === 'inline') {
    const Inline = props.inline;

    return <Inline {...picker} />;
  }

  if (picker.presentation === 'menu') {
    const Menu = props.menu;

    return <Menu {...picker} />;
  }

  return <ScreenPicker {...picker} row={props.row} />;
}

type RowProp = { row: NativePickerProps['row'] };

function ScreenPicker(props: FieldPickerProps & RowProp): ReactElement {
  const Row = props.row;

  return <FieldPickerDrill {...props} opener={<Row {...rowProps(props)} />} />;
}
