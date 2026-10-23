import { listStepperDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Button, type ButtonProps } from '#primitives/actions/button';
import type { ListItemStepperProps } from './list-item-stepper';

const stepVariant = Platform.OS === 'ios' ? 'secondary' : 'text';

export function StepperButtons(
  props: ListItemStepperProps & { children?: ReactNode },
): ReactElement {
  return (
    <View className="flex-row items-center rounded-control bg-muted">
      <Button {...stepButton(props, -1)} />
      {props.children}
      <Button {...stepButton(props, 1)} />
    </View>
  );
}

export function stepButton(
  props: ListItemStepperProps,
  direction: number,
): ButtonProps {
  const value = nextValue(props, direction);

  return {
    label: direction < 0 ? '−' : '+',
    variant: stepVariant,
    size: 'sm',
    disabled: props.disabled || value === props.value,
    onPress: () => props.onValueChange(value),
  };
}

interface StepAction {
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

// The web's icon-only step: the new Button has no accessibility label of its own, so the web names each step.
export function stepAction(
  props: ListItemStepperProps,
  direction: number,
): StepAction {
  const value = nextValue(props, direction);

  return {
    accessibilityLabel: `${direction < 0 ? 'Decrease' : 'Increase'} ${props.title}`,
    disabled: !!props.disabled || value === props.value,
    onPress: () => props.onValueChange(value),
  };
}

function nextValue(props: ListItemStepperProps, direction: number): number {
  const { min, max } = limits(props);

  return Math.min(
    max,
    Math.max(
      min,
      props.value + direction * (props.step ?? listStepperDefaults.step),
    ),
  );
}

type StepperLimits = { min: number; max: number };

function limits(props: ListItemStepperProps): StepperLimits {
  return { min: props.min ?? -Infinity, max: props.max ?? Infinity };
}
