// Universal Picker exposes menu selection only; Compose owns the segmented drawing and disabled options.
import {
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import type {
  SegmentedControlProps,
  SegmentOption,
} from './segmented-control-props';

export function SegmentedControlDrawing(
  props: SegmentedControlProps,
): ReactElement {
  const colors = useColors();
  const modifiers = [semantics({ contentDescription: props.label })];

  return (
    <SingleChoiceSegmentedButtonRow modifiers={modifiers}>
      {props.options.map((option) => (
        <Segment key={option.value} {...{ ...props, option, colors }} />
      ))}
    </SingleChoiceSegmentedButtonRow>
  );
}

type SegmentProps = SegmentedControlProps & {
  option: SegmentOption;
  colors: React.ComponentProps<typeof SegmentedButton>['colors'];
};

function Segment(props: SegmentProps): ReactElement {
  return (
    <SegmentedButton {...segmentProps(props)}>
      <SegmentedButton.Label>
        <Text>{props.option.label}</Text>
      </SegmentedButton.Label>
    </SegmentedButton>
  );
}

const segmentProps = ({
  option,
  value,
  onValueChange,
  colors,
  disabled,
}: SegmentProps): React.ComponentProps<typeof SegmentedButton> => ({
  selected: option.value === value,
  enabled: !disabled && !option.disabled,
  onClick: () => onValueChange(option.value),
  colors,
});

function useColors(): React.ComponentProps<typeof SegmentedButton>['colors'] {
  const { foreground, content, card, border } = useNativeTheme().colors;

  return {
    activeContainerColor: card,
    inactiveContainerColor: content,
    activeContentColor: foreground,
    inactiveContentColor: foreground,
    activeBorderColor: border,
    inactiveBorderColor: border,
  };
}
