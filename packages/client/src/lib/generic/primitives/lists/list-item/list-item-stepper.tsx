import type { ReactElement } from 'react';
import type { KitProps } from '../../kit-props';
import { ListItemFrame } from './list-item';
import { StepperValue } from './stepper-value';

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
