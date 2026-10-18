import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { KitProps } from '../../kit-props';
import { ListItemFrame } from './list-item';
import { StepperControl } from './stepper-control';

export type ListItemStepperProps = KitProps<'ListItem.Stepper'>;

export function ListItemStepper(props: ListItemStepperProps): ReactElement {
  return (
    <ListItemFrame
      {...props}
      accessible={false}
      value={undefined}
      trailing={<StepperValue {...props} />}
    />
  );
}

function StepperValue(props: ListItemStepperProps): ReactElement {
  return (
    <View className="flex-row items-center gap-3">
      <Text role="row" tone="muted">
        {props.value}
      </Text>
      <StepperControl {...props} />
    </View>
  );
}
