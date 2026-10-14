import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import { PickerDrillIn } from './picker-drill-in.ios';
import { NativeMenuPicker, NativePickerRow } from './picker-menu.ios';
import { createNativePicker, type PickerPresentation } from './picker-native';
import type { PickerProps } from './picker-props';
import { PickerSearchList } from './picker-search-list';

const menuLimit = 7;

type ControlProps<Value extends string> = PickerProps<Value> &
  PickerPresentation;

export const Picker = createNativePicker(PickerControl);

function PickerControl<Value extends string>(
  props: ControlProps<Value>,
): React.JSX.Element {
  const navigation = useSheetNavigation();
  const onPress = sheetPress(props, navigation);

  return (
    <>
      <PickerRow {...props} onPress={onPress} />
      {!navigation && <PickerDrillIn {...props} />}
    </>
  );
}

function PickerRow<Value extends string>(
  props: ControlProps<Value>,
): React.JSX.Element {
  return props.options.length > menuLimit ? (
    <NativePickerRow {...props} />
  ) : (
    <NativeMenuPicker {...props} />
  );
}

function sheetPress<Value extends string>(
  props: ControlProps<Value>,
  navigation: ReturnType<typeof useSheetNavigation>,
): () => void {
  if (!navigation) return props.onPress;

  return (): void =>
    navigation.push({
      title: props.label,
      content: <PickerSearchList {...props} onClose={navigation.back} />,
    });
}
