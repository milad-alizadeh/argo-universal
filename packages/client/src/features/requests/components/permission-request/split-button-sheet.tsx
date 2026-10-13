import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text/text';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import { Pressable, contentActionClass } from '#primitives/pressable/pressable';
import { IconSlot } from '../../../../lib/generic/symbols/icon';
import type { ChoiceProps, SplitButtonChoice } from './split-button';
import { chevron, chevronSizes } from './split-button-chevron';

type SheetProps<Value extends string> = ChoiceProps<Value> & {
  height?: number;
};

interface SheetChoicesProps<Value extends string> {
  choices: readonly SplitButtonChoice<Value>[];
  value: Value;
  onChoose: (value: Value) => void;
}

interface ChoiceSheetState<Value extends string> {
  open: boolean;
  setOpen: (open: boolean) => void;
  choose: (value: Value) => void;
}

interface ChoiceLabelProps {
  label: string;
  selected: boolean;
}

type SheetChoiceProps<Value extends string> = Omit<
  SheetChoicesProps<Value>,
  'choices'
> & { choice: SplitButtonChoice<Value> };

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
      trigger={chevron(props, cn(chevronSizes.phone, props.className))}
    >
      <SheetChoices {...props} onChoose={sheet.choose} />
    </BottomSheet>
  );
}

// The Sheet closes after a choice, and when its button turns disabled.
function useChoiceSheet<Value extends string>({
  disabled,
  onValueChange,
}: SheetProps<Value>): ChoiceSheetState<Value> {
  const [open, setOpen] = useState(false);

  if (disabled && open) setOpen(false);

  const choose = (value: Value): void => {
    setOpen(false);
    onValueChange(value);
  };

  return { open, setOpen, choose };
}

function SheetChoices<Value extends string>(
  props: SheetChoicesProps<Value>,
): ReactNode {
  return (
    <View className="gap-0.5 p-1">
      {props.choices.map((choice) => (
        <SheetChoice key={choice.value} {...props} choice={choice} />
      ))}
    </View>
  );
}

function SheetChoice<Value extends string>(
  props: SheetChoiceProps<Value>,
): ReactNode {
  const selected = props.choice.value === props.value;

  return (
    <Pressable
      {...sheetChoiceProps}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={() => props.onChoose(props.choice.value)}
    >
      <ChoiceLabel label={props.choice.label} selected={selected} />
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
