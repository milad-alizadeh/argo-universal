import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import {
  BottomSheet,
  type BottomSheetProps,
} from '#primitives/overlays/bottom-sheet';
import { chevron } from './split-button-chevron';
import type { SplitMenuProps } from './split-button-props';

type SheetProps<Value extends string> = SplitMenuProps<Value> & {
  height?: number;
};

// One row of the Sheet: a choice, checked when chosen, or an action.
interface SheetRow {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

interface SheetState {
  open: boolean;
  setOpen: (open: boolean) => void;
  // Closes the Sheet, then runs what the row does.
  run: (row: SheetRow) => void;
}

// The kit sheet holding the chevron's choices or actions as grouped list rows.
export function ChoiceSheet<Value extends string>(
  props: SheetProps<Value>,
): ReactNode {
  const sheet = useSheet(props.disabled);

  return (
    <BottomSheet {...sheetProps(props, sheet)}>
      <SheetRows rows={sheetRows(props)} run={sheet.run} />
    </BottomSheet>
  );
}

// The sheet opens from the narrow chevron, named for the menu; the grouped rows own scrolling.
function sheetProps<Value extends string>(
  props: SheetProps<Value>,
  sheet: SheetState,
): Omit<BottomSheetProps, 'children'> {
  return {
    contentScrolls: true,
    open: sheet.open,
    onOpenChange: sheet.setOpen,
    label: props.menuLabel,
    trigger: chevron({ ...props, narrow: true }),
  };
}

// The Sheet closes after a choice, and when its button turns disabled.
function useSheet(disabled: boolean | undefined): SheetState {
  const [open, setOpen] = useState(false);

  if (disabled && open) setOpen(false);

  const run = (row: SheetRow): void => {
    setOpen(false);
    row.onPress();
  };

  return { open, setOpen, run };
}

function SheetRows(props: {
  rows: SheetRow[];
  run: SheetState['run'];
}): ReactNode {
  return (
    <GroupedList fit>
      <GroupedListSection>
        {props.rows.map((row) => (
          <GroupedListItem key={row.label} {...rowProps(row, props.run)} />
        ))}
      </GroupedListSection>
    </GroupedList>
  );
}

function sheetRows<Value extends string>(
  props: SplitMenuProps<Value>,
): SheetRow[] {
  if (props.actions) return [...props.actions];

  return props.options.map((choice) => ({
    label: choice.label,
    selected: choice.value === props.value,
    onPress: () => props.onValueChange(choice.value),
  }));
}

function rowProps(
  row: SheetRow,
  run: SheetState['run'],
): React.ComponentProps<typeof GroupedListItem> {
  const selected = row.selected === true;

  return {
    label: row.label,
    accessibilityRole: 'button',
    selected,
    disclosure: false,
    accessory: selected ? <SelectedCheck /> : undefined,
    onPress: () => run(row),
  };
}
