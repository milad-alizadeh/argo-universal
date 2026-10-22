import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import type { ListItemStepperProps } from './list-item-stepper';
import { stepAction } from './stepper-buttons';

// Each half of the 32-tall pill is 44 wide, so the −/+ glyphs sit apart either side of the divider.
const buttonClass = 'h-8 min-h-8 w-11 web:sm:h-8 web:sm:w-11';

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
    <IconButton
      {...stepAction(row, direction)}
      icon={direction < 0 ? 'subtract' : 'add'}
      variant="ghost"
      size="sm"
      corners="round"
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
