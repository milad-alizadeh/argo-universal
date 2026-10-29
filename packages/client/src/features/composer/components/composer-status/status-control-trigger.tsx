import { Pill, type PillProps } from '@repo/kit/primitives/status/pill';
import type { JSX } from 'react';

interface ControlTriggerProps {
  label: string;
  disabled: boolean;
  wide: boolean;
  detail?: string;
  icon?: PillProps['icon'];
  leading?: PillProps['leading'];
}

export function createStatusControlTrigger({
  label,
  wide,
  ...props
}: ControlTriggerProps): JSX.Element {
  return (
    <Pill
      {...props}
      variant="control"
      text={label}
      iconOnly={!wide}
      accessibilityLabel={label === 'Context' ? 'Context window' : label}
    />
  );
}
