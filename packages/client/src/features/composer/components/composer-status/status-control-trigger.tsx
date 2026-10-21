import { contentActionClass } from '@repo/kit/primitives/actions/button';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { cn } from '@repo/kit/utils';
import type { JSX, ReactNode } from 'react';
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

/*
 * A narrow column draws no word at all rather than a hidden one: the trigger is sized icon-only from the same
 * `wide`, and a `wide-type:` class on a hidden label would beat the `hidden` and spill the word out of a 28px
 * box over the ring. Dropping the label leaves the two to agree (owner, 2026-10-21).
 */
export function ControlLabel({
  label,
  wide,
  className,
}: ControlLabelProps): JSX.Element | null {
  if (!wide) return null;

  return (
    <StatusText
      role="secondary"
      className={cn('select-none text-foreground', className)}
    >
      {label}
    </StatusText>
  );
}
