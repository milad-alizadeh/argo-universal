import { useState, type ReactElement, type ReactNode } from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import type { FieldPickerProps } from './field-picker-model';
import { FieldPickerPage } from './field-picker-page';

type SheetProps = FieldPickerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const sheetProps = (
  props: SheetProps,
): Omit<SheetComponentProps, 'children'> => ({
  open: props.open,
  onOpenChange: props.onOpenChange,
  label: props.title,
  detents: ['large'],
  contentScrolls: true,
});

type SheetComponentProps = React.ComponentProps<typeof Sheet>;

// The choices of a `page` on the Sheet that holds them, when no enclosing Sheet has a stack to push them on.
function PageSheet(props: SheetProps): ReactElement {
  return (
    <Sheet {...sheetProps(props)}>
      <Sheet.Page name="options" title={props.title}>
        {props.open && (
          <FieldPickerPage
            {...props}
            onClose={() => props.onOpenChange(false)}
          />
        )}
      </Sheet.Page>
    </Sheet>
  );
}

type Row = (opening: { onPress: () => void; sheet: ReactNode }) => ReactElement;

/*
 * ADR-0042: a `page` always shows its page with the search field, whatever surrounds the row. Inside a Sheet the
 * page pushes in its stack (FieldPickerDrill); outside one this opens a Sheet of its own, drawn into the
 * FieldGroup's native tree beside the row.
 */
export function SheetPicker(
  props: FieldPickerProps & { row: Row },
): ReactElement {
  const [open, setOpen] = useState(false);

  return props.row({
    onPress: () => {
      if (!props.disabled) setOpen(true);
    },
    sheet: <PageSheet {...props} open={open} onOpenChange={setOpen} />,
  });
}
