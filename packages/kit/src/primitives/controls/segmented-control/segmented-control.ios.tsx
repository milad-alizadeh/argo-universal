// Universal Picker exposes menu selection only; SwiftUI owns the segmented drawing and disabled options.
import { Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { ControlHost } from '#primitives/native/native-control';
import type {
  SegmentedControlProps,
  SegmentOption,
} from './segmented-control-props';

export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  return (
    <ControlHost matchContents={{ vertical: true }}>
      <Picker {...pickerProps(props)}>
        {props.options.map((option) => (
          <Option key={option.value} {...option} />
        ))}
      </Picker>
    </ControlHost>
  );
}

const pickerProps = (
  props: SegmentedControlProps,
): React.ComponentProps<typeof Picker<string>> => ({
  label: props.label,
  selection: props.value,
  onSelectionChange: props.onValueChange,
  modifiers: [pickerStyle('segmented'), accessibilityLabel(props.label)],
});

function Option(props: SegmentOption): ReactElement {
  return (
    <Text modifiers={[tag(props.value), disabled(props.disabled === true)]}>
      {props.label}
    </Text>
  );
}
