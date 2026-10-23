import type { ReactElement } from 'react';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import { FieldPickerDrill } from './field-picker-drill';
import { MenuPicker, MultipleMenu } from './field-picker-menu.ios';
import {
  choiceSummary,
  widened,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { PageRow } from './field-picker-page-row.ios';
import { SheetPicker } from './field-picker-sheet';

/*
 * A `menu` opens in place: SwiftUI's menu Picker, or a Menu of checked items for a `multiple` choice. A `page`
 * always opens its page: pushed in the enclosing Sheet's NavigationStack, as SwiftUI's `.navigationLink` Picker
 * does, or on a Sheet of its own when no Sheet encloses the row. It never changes with its parent (ADR-0042).
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = widened(caller);
  const sheet = useOptionalSheet();

  if (props.presentation === 'menu') return <InPlace {...props} />;

  return sheet ? <PagePicker {...props} /> : <SheetPage {...props} />;
}

function InPlace(props: FieldPickerProps): ReactElement {
  return props.multiple ? (
    <MultipleMenu {...props} />
  ) : (
    <MenuPicker {...props} />
  );
}

const rowProps = (props: FieldPickerProps): RowProps => ({
  title: props.title,
  leading: props.leading,
  summary: choiceSummary(props),
  disabled: props.disabled,
});

type RowProps = React.ComponentProps<typeof PageRow>;

function PagePicker(props: FieldPickerProps): ReactElement {
  return (
    <FieldPickerDrill {...props} trigger={<PageRow {...rowProps(props)} />} />
  );
}

function SheetPage(props: FieldPickerProps): ReactElement {
  return (
    <SheetPicker
      {...props}
      row={(opening) => <PageRow {...rowProps(props)} {...opening} />}
    />
  );
}
