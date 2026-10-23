import { type ComponentType, createElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import type { CheckboxProps, CheckboxIndicatorProps } from './checkbox-props';
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
    className: controlClass(props),
  };
}

function checkboxSemantics(
  props: CheckboxProps,
  state: CheckboxState,
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    type: 'button',
    role: props.selection === 'single' ? 'radio' : 'checkbox',
    'aria-label': props.label,
    'aria-disabled': !!props.disabled,
    'aria-checked': props.value,
    'aria-invalid': state.invalid,
    'aria-describedby': state.descriptionId,
  };
}

// Inline sits beside other content, such as a file header, sized to its label in the badge size.
const rowLayout = {
  row: {
    row: 'w-full flex-row items-center gap-2.5',
    label: 'min-w-0 flex-1',
    role: 'body',
  },
  inline: {
    row: 'flex-row items-center gap-1.5',
    label: undefined,
    role: 'badge',
  },
} as const;

function CheckboxRow(props: CheckboxProps): React.JSX.Element {
  const layout = rowLayout[props.variant === 'inline' ? 'inline' : 'row'];

  return (
    <View className={layout.row}>
      {props.selection !== 'single' && <CheckboxIndicator {...props} />}
      <Text role={layout.role} className={layout.label}>
        {props.label}
      </Text>
      <SelectedMark {...props} />
    </View>
  );
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): React.JSX.Element {
  return (
    <View aria-hidden className={markClassName(props)}>
      {props.value && (
        <Icon name="check" size="sm" className="text-primary-foreground" />
      )}
    </View>
  );
}

function markClassName(props: CheckboxIndicatorProps): string {
  return cn(
    'size-4.5 shrink-0 items-center justify-center rounded-sm border-2 border-border',
    optionMarkClass(props),
    props.value && 'border-primary bg-primary',
    props.invalid && 'border-danger',
  );
}

function controlClass(props: CheckboxProps): string {
  return cn(
    'flex min-h-13 w-full cursor-default justify-start items-center rounded-md border-0 bg-muted p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus',
    variantClass(props),
    props.disabled && 'opacity-50',
  );
}

function variantClass(props: CheckboxProps): string | undefined {
  if (props.variant === 'inline')
    return 'min-h-0 w-auto shrink-0 rounded-xs bg-transparent p-0';

  return props.variant === 'option' ? optionClass(props) : undefined;
}

function optionClass(props: CheckboxProps): string {
  return cn(
    'min-h-9 rounded-lg bg-transparent px-2.5 py-2',
    props.value && 'bg-selected',
  );
}

function SelectedMark(props: CheckboxProps): React.JSX.Element | null {
  if (props.selection !== 'single' || !props.value) return null;

  return <Icon name="check" size="sm" />;
}

function optionMarkClass(props: CheckboxIndicatorProps): string | undefined {
  if (props.variant === 'inline')
    return 'size-4 rounded-xs border border-border bg-card';

  return props.variant === 'option'
    ? 'size-4 rounded-xs border border-focus'
    : undefined;
}

Checkbox satisfies ComponentType<CheckboxProps>;

CheckboxIndicator satisfies ComponentType<CheckboxIndicatorProps>;
