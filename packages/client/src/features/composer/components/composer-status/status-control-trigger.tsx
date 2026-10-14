import type { JSX, ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/buttons/button';
import { Pressable } from '#primitives/pressable';
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
  const widthClass = wide
    ? 'w-auto px-1.5 has-[>[data-icon]]:px-1.5'
    : 'w-7 px-0 has-[>[data-icon]]:px-0';

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
}

export function ControlLabel({ label, wide }: ControlLabelProps): JSX.Element {
  return (
    <StatusText
      role="secondary"
      className={cn('select-none text-foreground', !wide && 'hidden')}
    >
      {label}
    </StatusText>
  );
}
