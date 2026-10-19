import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import type { ListItemStepperProps } from './list-item-stepper';
import { StepperButtons } from './stepper-buttons';

export function StepperValue(props: ListItemStepperProps): ReactElement {
  return (
    <StepperButtons {...props}>
      <Text role="row" tone="muted" className="min-w-6 text-center">
        {props.value}
      </Text>
    </StepperButtons>
  );
}
