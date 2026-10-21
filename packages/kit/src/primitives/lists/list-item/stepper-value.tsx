import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { ListItemStepperProps } from './list-item-stepper';
import { StepperControl } from './stepper-control';

export function StepperValue(props: ListItemStepperProps): ReactElement {
  return (
    <View className="flex-row items-center gap-3">
      <Text role="row" tone="muted">
        {props.value}
      </Text>
      <StepperControl {...props} />
    </View>
  );
}
