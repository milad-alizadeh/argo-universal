import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { BottomSheet } from '#primitives/overlays/bottom-sheet';
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

// The kit sheet holding the chevron's choices or actions as grouped list rows.
export function ChoiceSheet<Value extends string>(
  props: SheetProps<Value>,
): ReactNode {
  const [open, setOpen] = useState(false);

  // The Sheet closes when its button turns disabled.
  if (props.disabled && open) setOpen(false);

  const run = (row: SheetRow): void => {
    setOpen(false);
    row.onPress();
  };

  return (
    <BottomSheet
      contentScrolls
      open={open}
      onOpenChange={setOpen}
      label={props.menuLabel}
      trigger={chevron({ ...props, narrow: true })}
    >
      <GroupedList fit>
        <GroupedListSection>
          {sheetRows(props).map((row) => (
            <GroupedListItem key={row.label} {...rowProps(row, run)} />
          ))}
        </GroupedListSection>
      </GroupedList>
    </BottomSheet>
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
  run: (row: SheetRow) => void,
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
