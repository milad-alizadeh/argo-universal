import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import type {
  SegmentedControlProps,
  SegmentOption,
} from './segmented-control-props';

// Paper's phone Git sheet: two equal capsule segments in one compact track.
export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  return (
    <View
      role="group"
      accessibilityLabel={props.label}
      className="h-8 flex-row gap-0.5 rounded-full bg-tint p-0.5"
    >
      {props.options.map((option) => (
        <Segment key={option.value} {...props} option={option} />
      ))}
    </View>
  );
}

type SegmentProps = SegmentedControlProps & { option: SegmentOption };

function Segment(props: SegmentProps): ReactElement {
  return (
    <Pressable {...segmentProps(props)}>
      <Text role="control" selectable={false}>
        {props.option.label}
      </Text>
    </Pressable>
  );
}

const segmentProps = ({
  option,
  value,
  onValueChange,
}: SegmentProps): React.ComponentProps<typeof Pressable> &
  Pick<React.AriaAttributes, 'aria-pressed'> => ({
  role: 'button',
  'aria-pressed': option.value === value,
  disabled: option.disabled,
  accessibilityLabel: option.label,
  onPress: () => onValueChange(option.value),
  className: segmentClass(option.value === value),
});

const segmentClass = (selected: boolean): string =>
  cn(
    'min-w-0 flex-1 items-center justify-center rounded-full web:focus-visible:outline-2 web:focus-visible:outline-focus',
    selected && 'bg-card segment-selected',
  );
