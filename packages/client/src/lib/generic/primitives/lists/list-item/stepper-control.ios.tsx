import { Stepper } from '@expo/ui/swift-ui';
import {
  accessibilityValue,
  disabled,
  labelsHidden,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { ControlHost } from '#primitives/native/native-control';
import type { ListItemStepperProps } from './list-item-stepper';

export function StepperControl(props: ListItemStepperProps): ReactElement {
  return (
    <ControlHost matchContents>
      <Stepper
        {...props}
        label={props.title}
        modifiers={[
          labelsHidden(),
          accessibilityValue(String(props.value)),
          disabled(!!props.disabled),
        ]}
      />
    </ControlHost>
  );
}
