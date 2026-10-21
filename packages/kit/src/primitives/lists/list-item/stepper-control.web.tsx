import type { ReactElement } from 'react';
import { View } from 'react-native';
import { DrawnButton } from '#primitives/actions/button';
import type { ListItemStepperProps } from './list-item-stepper';
import { stepButton } from './stepper-buttons';

const buttonClass =
  'h-8 min-h-8 w-11 gap-0 rounded-full p-0 web:sm:h-8 web:sm:min-h-8';

export function StepperControl(props: ListItemStepperProps): ReactElement {
  return (
    <View className="relative h-8 flex-row items-center rounded-full bg-muted">
      <StepAction row={props} direction={-1} />
      <StepAction row={props} direction={1} />
      <Divider />
    </View>
  );
}

interface StepActionProps {
  row: ListItemStepperProps;
  direction: number;
}

function StepAction({ row, direction }: StepActionProps): ReactElement {
  return (
    <DrawnButton
      {...stepButton(row, direction)}
      label=""
      icon={direction < 0 ? 'subtract' : 'add'}
      className={buttonClass}
    />
  );
}

function Divider(): ReactElement {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute inset-y-1.5 left-1/2 w-px bg-border"
    />
  );
}
