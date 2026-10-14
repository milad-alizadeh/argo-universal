import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import {
  type LiveProps,
  type SheetNavigation,
  useLatestProps,
  useLiveProps,
} from './picker-live-props';
import { NativeOptionRows } from './picker-native-options';
import type { PickerProps } from './picker-props';
import { choosePickerOption, pickerValue } from './picker-selection';

/*
 * A Picker drawn as a drill row in a phone sheet: pressing it pushes the options as a page of the
 * same sheet, drawn with the platform's own list rows. Outside such a sheet the plain Picker stands in.
 */
export function PickerDrillRow<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element | null {
  const navigation = useSheetNavigation();
  const live = useLiveProps(props);

  if (!navigation) return null;

  return <DrillRow {...props} onPress={() => pushOptions(live, navigation)} />;
}

function DrillRow<Value extends string>(
  props: PickerProps<Value> & { onPress: () => void },
): React.JSX.Element {
  return (
    <GroupedListItem
      label={props.label}
      value={pickerValue(props)}
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
    />
  );
}

function pushOptions<Value extends string>(
  live: LiveProps<PickerProps<Value>>,
  navigation: SheetNavigation,
): void {
  navigation.push({
    title: `Select ${live.get().label}`,
    content: <LivePage live={live} onChosen={navigation.back} />,
  });
}

// The pushed page follows the row's options, such as an Agent a retry makes ready.
function LivePage<Value extends string>(props: {
  live: LiveProps<PickerProps<Value>>;
  onChosen: () => void;
}): React.JSX.Element {
  const picker = useLatestProps(props.live);

  return <DrillPage {...picker} onChosen={props.onChosen} />;
}

type PageProps<Value extends string> = PickerProps<Value> & {
  onChosen: () => void;
};

function DrillPage<Value extends string>(
  props: PageProps<Value>,
): React.JSX.Element {
  return (
    <GroupedList>
      <GroupedListSection footer={props.loadError}>
        <NativeOptionRows
          {...props}
          onChoose={(option) => chooseOption(props, option.value)}
        />
      </GroupedListSection>
    </GroupedList>
  );
}

function chooseOption<Value extends string>(
  props: PageProps<Value>,
  value: Value,
): void {
  choosePickerOption(props, value);
  props.onChosen();
}
