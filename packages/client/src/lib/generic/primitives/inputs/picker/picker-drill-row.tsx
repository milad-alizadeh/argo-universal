import type * as React from 'react';
import { View } from 'react-native';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { useWide } from '../../../use-wide/use-wide';
import {
  type LiveProps,
  type SheetNavigation,
  useLatestProps,
  useLiveProps,
} from './picker-live-props';
import { PickerOptionList } from './picker-option-list';
import type { PickerProps } from './picker-props';
import { choosePickerOption, pickerValue } from './picker-selection';

/*
 * A Picker drawn as a drill row in a menu or sheet. A wide window opens the options beside the row
 * on hover or press; a phone sheet pushes them as a page of its own.
 */
export function PickerDrillRow<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const wide = useWide();
  const navigation = useSheetNavigation();
  const live = useLiveProps(props);

  if (wide || !navigation) return <SidePopoverRow {...props} wide={wide} />;

  return (
    <DrillRow
      {...props}
      trigger={{ onPress: () => pushOptions(live, navigation) }}
    />
  );
}

const drillTitle = (props: Pick<PickerProps<string>, 'label'>): string =>
  `Select ${props.label}`;

function pushOptions<Value extends string>(
  live: LiveProps<PickerProps<Value>>,
  navigation: SheetNavigation,
): void {
  navigation.push({
    title: drillTitle(live.get()),
    content: <PageOptions live={live} onChosen={navigation.back} />,
  });
}

// The pushed page follows the row's options, such as an Agent a retry makes ready.
function PageOptions<Value extends string>(props: {
  live: LiveProps<PickerProps<Value>>;
  onChosen: () => void;
}): React.JSX.Element {
  const picker = useLatestProps(props.live);

  return (
    <View className="px-4 pb-4">
      <DrillOptions {...picker} wide={false} onChosen={props.onChosen} />
    </View>
  );
}

type TriggerProps = Partial<React.ComponentProps<typeof GroupedListItem>>;

// The row, its value as a subtitle; a popover trigger hands it the hover, press and ARIA props it opens with.
function DrillRow<Value extends string>({
  trigger,
  ...props
}: PickerProps<Value> & { trigger?: TriggerProps }): React.JSX.Element {
  return (
    <GroupedListItem
      {...trigger}
      label={props.label}
      subtitle={{ text: pickerValue(props) }}
      accessibilityRole="button"
      disabled={props.disabled}
    />
  );
}

// Beside the row on a wide window; below it in a narrow one's popover.
const sidePlacement = {
  wide: { side: 'right', sideOffset: 24 },
  narrow: { side: 'bottom', sideOffset: 4 },
} as const;

const sideContentClassName =
  'w-72 rounded-surface border-0 bg-content p-2 shadow-card';

function SidePopoverRow<Value extends string>(
  props: PickerProps<Value> & { wide: boolean },
): React.JSX.Element {
  return (
    <Popover openOnHover>
      <PopoverTrigger asChild disabled={props.disabled}>
        <TriggerRow picker={props} />
      </PopoverTrigger>
      <SideOptions {...props} />
    </Popover>
  );
}

// The trigger's own props reach the row through here.
function TriggerRow<Value extends string>({
  picker,
  ...trigger
}: { picker: PickerProps<Value> } & TriggerProps): React.JSX.Element {
  return <DrillRow {...picker} trigger={trigger} />;
}

function SideOptions<Value extends string>(
  props: PickerProps<Value> & { wide: boolean },
): React.JSX.Element {
  return (
    <PopoverContent
      {...sidePlacement[props.wide ? 'wide' : 'narrow']}
      align="start"
      accessibilityLabel={drillTitle(props)}
      className={sideContentClassName}
    >
      <PopoverOptions {...props} />
    </PopoverContent>
  );
}

function PopoverOptions<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const close = usePopoverClose();

  return <DrillOptions {...props} wide onChosen={close} />;
}

function DrillOptions<Value extends string>(
  props: PickerProps<Value> & { wide: boolean; onChosen: () => void },
): React.JSX.Element {
  return (
    <PickerOptionList
      {...props}
      onChoose={(option) => {
        choosePickerOption(props, option.value);
        props.onChosen();
      }}
    />
  );
}
