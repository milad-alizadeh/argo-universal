import { createElement } from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import { Icon } from '../../display/icon/icon';
import { Text } from '../../display/text/text';
import type { CheckboxProps } from './checkbox-props';
import {
  CheckboxFooter,
  type CheckboxState,
  useCheckboxState,
} from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  const state = useCheckboxState(props);
  return (
    <View className="gap-2">
      {createElement(
        'button',
        controlProps(props, state),
        <CheckboxRow {...props} invalid={state.invalid} />,
      )}
      <CheckboxFooter {...state} />
    </View>
  );
}

function controlProps(
  props: CheckboxProps,
  state: CheckboxState,
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    ...checkboxSemantics(props, state),
    disabled: props.disabled,
    onClick: state.toggle,
    onBlur: props.onBlur,
    className: cn(
      'flex min-h-13 w-full cursor-default justify-start items-center rounded-md border-0 bg-muted p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
      props.disabled && 'opacity-50',
    ),
  };
}

function checkboxSemantics(
  props: CheckboxProps,
  state: CheckboxState,
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    type: 'button',
    role: 'checkbox',
    'aria-label': props.label,
    'aria-disabled': !!props.disabled,
    'aria-checked': props.value,
    'aria-invalid': state.invalid,
    'aria-describedby': state.descriptionId,
  };
}

function CheckboxRow(props: CheckboxProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2.5">
      <CheckboxMark {...props} />
      <Text role="body" className="min-w-0 flex-1">
        {props.label}
      </Text>
    </View>
  );
}

function CheckboxMark(props: CheckboxProps): React.JSX.Element {
  return (
    <View aria-hidden className={markClassName(props)}>
      {props.value && (
        <Icon name="check" role="mark" className="text-primary-foreground" />
      )}
    </View>
  );
}

function markClassName(props: CheckboxProps): string {
  return cn(
    'size-4.5 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-input',
    props.value && 'border-primary bg-primary',
    props.invalid && 'border-destructive',
  );
}
