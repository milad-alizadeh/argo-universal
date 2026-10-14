import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import {
  type LiveProps,
  useLatestProps,
  useLiveProps,
} from './picker-live-props';
import type {
  PickerOption,
  PickerOptionAction,
  PickerProps,
} from './picker-props';
import { choosePickerOption, pickerValue } from './picker-selection';

type Navigation = NonNullable<ReturnType<typeof useSheetNavigation>>;

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
  navigation: Navigation,
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
        {props.options.map((option) => (
          <DrillOption key={option.value} {...props} option={option} />
        ))}
      </GroupedListSection>
    </GroupedList>
  );
}

function DrillOption<Value extends string>(
  props: PageProps<Value> & { option: PickerOption<Value> },
): React.JSX.Element {
  return (
    <>
      <GroupedListItem {...optionRowProps(props)} />
      <ActionRow action={props.option.action} />
    </>
  );
}

const choiceRow = { accessibilityRole: 'button', disclosure: false } as const;

function optionRowProps<Value extends string>(
  props: PageProps<Value> & { option: PickerOption<Value> },
): React.ComponentProps<typeof GroupedListItem> {
  const { option } = props;
  const selected = option.value === props.value;

  return {
    ...optionContent(option),
    ...choiceRow,
    selected,
    accessory: selected ? <SelectedCheck /> : undefined,
    onPress: () => chooseOption(props, option),
  };
}

function chooseOption<Value extends string>(
  props: PageProps<Value>,
  option: PickerOption<Value>,
): void {
  choosePickerOption(props, option.value);
  props.onChosen();
}

function optionContent<Value extends string>(
  option: PickerOption<Value>,
): React.ComponentProps<typeof GroupedListItem> {
  return {
    label: option.label,
    accessibilityLabel: option.accessibilityLabel,
    subtitle: option.supporting ? { text: option.supporting } : undefined,
    icon: option.icon,
    disabled: option.disabled,
  };
}

function ActionRow(props: {
  action?: PickerOptionAction;
}): React.JSX.Element | null {
  const { action } = props;

  if (!action) return null;

  return (
    <GroupedListItem
      label={action.label}
      accessibilityLabel={action.accessibilityLabel}
      accessibilityRole="button"
      tone="accent"
      onPress={action.onPress}
    />
  );
}
