import type { ComponentType, ReactElement, ReactNode } from 'react';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import { FieldPickerDrill } from './field-picker-drill';
import {
  choiceSummary,
  widened,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { SheetPicker } from './field-picker-sheet';

export type NativeRowProps = Pick<
  FieldPickerProps,
  'title' | 'leading' | 'disabled'
> & {
  summary: string;
  onPress?: () => void;
  // The Sheet this row opens when no enclosing Sheet holds the page, drawn into the row's own tree.
  sheet?: ReactNode;
};

type NativePickerProps = {
  caller: FieldPickerCallerProps | FieldPickerProps;
  // What a `menu` draws, in place of the row's page.
  menu: ComponentType<FieldPickerProps>;
  // The platform's row: it opens the page, or the menu.
  row: ComponentType<NativeRowProps>;
};

export const rowProps = (props: FieldPickerProps): NativeRowProps => ({
  title: props.title,
  leading: props.leading,
  summary: choiceSummary(props),
  disabled: props.disabled,
});

/*
 * The phones' picker, whatever the platform draws: a `menu` opens in place, a `page` always opens its page, pushed
 * in the enclosing Sheet or on a Sheet of its own when none encloses the row. It never changes with its parent
 * (ADR-0042).
 */
export function NativePicker(props: NativePickerProps): ReactElement {
  const picker = widened(props.caller);
  const sheet = useOptionalSheet();

  if (picker.presentation === 'menu') {
    const Menu = props.menu;

    return <Menu {...picker} />;
  }

  return sheet ? (
    <PagePicker {...picker} row={props.row} />
  ) : (
    <SheetPage {...picker} row={props.row} />
  );
}

type RowProp = { row: NativePickerProps['row'] };

function PagePicker(props: FieldPickerProps & RowProp): ReactElement {
  const Row = props.row;

  return <FieldPickerDrill {...props} trigger={<Row {...rowProps(props)} />} />;
}

function SheetPage(props: FieldPickerProps & RowProp): ReactElement {
  const Row = props.row;

  return (
    <SheetPicker
      {...props}
      row={(opening) => <Row {...rowProps(props)} {...opening} />}
    />
  );
}
