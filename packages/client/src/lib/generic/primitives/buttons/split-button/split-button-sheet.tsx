import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { contentActionClass } from '#primitives/buttons/button';
import { IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
import { BottomSheet } from '#primitives/overlays/bottom-sheet';
import { Pressable } from '#primitives/pressable';
import { chevron } from './split-button-chevron';
import type { SplitMenuProps } from './split-button-props';

type SheetProps<Value extends string> = SplitMenuProps<Value> & {
  height?: number;
};

// One row of the Sheet: a choice, checked when chosen, or an action.
interface SheetRow {
  label: string;
  selected?: boolean;
  onSelect: () => void;
}

interface ChoiceSheetState {
  open: boolean;
  setOpen: (open: boolean) => void;
  // Closes the Sheet, then runs what the row does.
  run: (select: () => void) => void;
}

interface ChoiceLabelProps {
  label: string;
  selected: boolean;
}

const sheetChoiceProps = {
  role: 'button',
  className: contentActionClass({
    variant: 'ghost',
    className:
      'h-auto min-h-11 justify-between rounded-sm px-2 py-1.5 sm:h-auto',
  }),
} as const;

export function ChoiceSheet<Value extends string>(
  props: SheetProps<Value>,
): ReactNode {
  const sheet = useChoiceSheet(props);

  return (
    <BottomSheet
      open={sheet.open}
      onOpenChange={sheet.setOpen}
      label={props.menuLabel}
      trigger={chevron({ ...props, narrow: true })}
    >
      <SheetChoices rows={sheetRows(props)} onRun={sheet.run} />
    </BottomSheet>
  );
}

// The Sheet closes after a choice, and when its button turns disabled.
function useChoiceSheet<Value extends string>({
  disabled,
}: SheetProps<Value>): ChoiceSheetState {
  const [open, setOpen] = useState(false);

  if (disabled && open) setOpen(false);

  const run = (select: () => void): void => {
    setOpen(false);
    select();
  };

  return { open, setOpen, run };
}

function sheetRows<Value extends string>(
  props: SplitMenuProps<Value>,
): SheetRow[] {
  if (props.actions) return [...props.actions];

  return props.choices.map((choice) => ({
    label: choice.label,
    selected: choice.value === props.value,
    onSelect: () => props.onValueChange(choice.value),
  }));
}

function SheetChoices(props: {
  rows: SheetRow[];
  onRun: SheetChoiceProps['onRun'];
}): ReactNode {
  return (
    <View className="gap-0.5 p-1">
      {props.rows.map((row) => (
        <SheetChoice key={row.label} row={row} onRun={props.onRun} />
      ))}
    </View>
  );
}

interface SheetChoiceProps {
  row: SheetRow;
  onRun: ChoiceSheetState['run'];
}

function SheetChoice({ row, onRun }: SheetChoiceProps): ReactNode {
  const selected = row.selected === true;

  return (
    <Pressable
      {...sheetChoiceProps}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={() => onRun(row.onSelect)}
    >
      <ChoiceLabel label={row.label} selected={selected} />
    </Pressable>
  );
}

function ChoiceLabel({ label, selected }: ChoiceLabelProps): ReactNode {
  return (
    <>
      <Text role="body">{label}</Text>
      <IconSlot role="control">
        {selected && <SelectedCheck className="text-foreground" />}
      </IconSlot>
    </>
  );
}
