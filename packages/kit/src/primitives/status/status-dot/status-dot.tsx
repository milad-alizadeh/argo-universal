import { statusDotDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { cn } from '#kit/utils';
import type { Tone } from '#primitives/content/text';
import { BlinkingDot } from './blinking-dot';
import type { StatusDotProps } from './status-dot-props';

const toneFill: Record<Tone, string> = {
  neutral: 'bg-foreground',
  muted: 'bg-muted-foreground',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  done: 'bg-done',
};

export function StatusDot(props: StatusDotProps): ReactElement {
  return <BlinkingDot {...blinkingDotProps(props)} />;
}

function blinkingDotProps(
  props: StatusDotProps,
): Parameters<typeof BlinkingDot>[0] {
  return {
    testID: props.testID,
    accessibilityLabel: props.accessibilityLabel,
    colorClassName: toneFill[props.tone],
    blinking: props.pulse ?? statusDotDefaults.pulse,
    className: cn(statusDotSizeClass(props.size), props.className),
  };
}

const sizeClass = {
  sm: 'size-1.5 shrink-0',
  md: 'size-2 shrink-0',
} as const satisfies Record<NonNullable<StatusDotProps['size']>, string>;

function statusDotSizeClass(size: StatusDotProps['size']): string {
  return sizeClass[size ?? statusDotDefaults.size];
}
