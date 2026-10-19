import type { JSX, ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { StatusText } from './status-text';

interface ControlTriggerProps {
  label: string;
  disabled: boolean;
  wide: boolean;
  children: ReactNode;
}

function statusTriggerClass({
  wide,
  disabled,
}: Pick<ControlTriggerProps, 'wide' | 'disabled'>): string {
  const widthClass = wide ? 'w-auto px-1.5' : 'w-7 px-0';

  return contentActionClass({
    variant: 'ghost',
    className: cn('h-7 sm:h-7 py-0 gap-1.5', widthClass),
    disabled,
  });
}

export function createStatusControlTrigger(
  props: ControlTriggerProps,
): JSX.Element {
  const pressableProps = {
    disabled: props.disabled,
    accessibilityLabel:
      props.label === 'Context' ? 'Context window' : props.label,
    className: statusTriggerClass(props),
  };

  return (
    <Pressable {...pressableProps} role="button">
      {props.children}
    </Pressable>
  );
}

interface ControlLabelProps {
  label: string;
  wide: boolean;
  className?: string;
}

export function ControlLabel({
  label,
  wide,
  className,
}: ControlLabelProps): JSX.Element {
  const shown = cn(className, !wide && 'hidden');

  return (
    <StatusText
      role="secondary"
      className={cn('select-none text-foreground', shown)}
    >
      {label}
    </StatusText>
  );
}
