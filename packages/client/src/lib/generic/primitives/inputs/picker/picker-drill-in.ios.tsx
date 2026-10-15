// iOS only: a long list opens a searchable page in a NavigationStack, which universal Picker cannot offer.
import { Button, Row, Text } from '@expo/ui';
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import { createElement, useState } from 'react';
import { errorMessage } from '#primitives/fields/field-errors';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { PickerDrillInSheet } from './picker-drill-in-sheet.ios';
import { PickerNativeField, PickerNativeHost } from './picker-native-field';
import type { PickerProps } from './picker-props';
import { PickerSearchList } from './picker-search-list';
import { pickerValue } from './picker-selection';

export const drillInLimit = 7;

type TriggerProps<Value extends string> = PickerProps<Value> & {
  onPress: () => void;
};

type DrillIn = { onPress: () => void; sheet: React.ReactNode };

export function PickerDrillIn<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const { onPress, sheet } = useDrillIn(props);

  return (
    <PickerNativeHost>
      <DrillInTrigger {...props} onPress={onPress} />
      {sheet}
    </PickerNativeHost>
  );
}

// Inside a sheet the options push onto its own navigation; elsewhere they open a sheet of their own.
function useDrillIn<Value extends string>(props: PickerProps<Value>): DrillIn {
  const [open, setOpen] = useState(false);
  const navigation = useSheetNavigation();

  if (navigation)
    return { onPress: pushOptions(props, navigation), sheet: null };

  const onClose = sheetClose(props, setOpen);
  const sheet = <PickerDrillInSheet {...props} open={open} onClose={onClose} />;

  return { onPress: (): void => setOpen(true), sheet };
}

function pushOptions<Value extends string>(
  props: PickerProps<Value>,
  navigation: NonNullable<ReturnType<typeof useSheetNavigation>>,
): () => void {
  return (): void =>
    navigation.push({
      title: props.label,
      content: <PickerSearchList {...props} onClose={navigation.back} />,
    });
}

function sheetClose<Value extends string>(
  props: PickerProps<Value>,
  setOpen: (open: boolean) => void,
): () => void {
  return (): void => {
    setOpen(false);
    props.onBlur?.();
  };
}

function DrillInTrigger<Value extends string>(
  props: TriggerProps<Value>,
): React.JSX.Element {
  return createElement(
    Button,
    triggerProps(props),
    <PickerNativeField {...props}>
      <TriggerValue {...props} />
    </PickerNativeField>,
  );
}

function triggerProps<Value extends string>(
  props: TriggerProps<Value>,
): React.ComponentProps<typeof Button> {
  return {
    variant: 'text',
    onPress: props.onPress,
    disabled: props.disabled,
    modifiers: triggerModifiers(props),
  };
}

function TriggerValue<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <Row alignment="center" spacing={6}>
      <Text textStyle={useUniversalTextStyle('body')}>
        {pickerValue(props)}
      </Text>
      <NativeSymbol name="chevron-up-down" role="body" />
    </Row>
  );
}

function triggerModifiers<Value extends string>(
  props: PickerProps<Value>,
): ReturnType<typeof accessibilityLabel>[] {
  return [
    accessibilityLabel(props.label),
    accessibilityValue(pickerValue(props)),
    accessibilityHint(triggerHint(props)),
  ];
}

function triggerHint<Value extends string>(props: PickerProps<Value>): string {
  return errorMessage(props.errors ?? []) ?? hintText(props.hint);
}

function hintText(hint?: string): string {
  return hint ?? '';
}
