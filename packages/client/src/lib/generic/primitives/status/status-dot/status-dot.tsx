import type { ReactElement } from 'react';
import { cn } from '#lib/generic/utils';
import { toneClass } from '#primitives/content/text';
import { BlinkingDot } from './blinking-dot';
import type { StatusDotProps } from './status-dot-props';

export function StatusDot(props: StatusDotProps): ReactElement {
  return <BlinkingDot {...blinkingDotProps(props)} />;
}

function blinkingDotProps(
  props: StatusDotProps,
): Parameters<typeof BlinkingDot>[0] {
  return {
    testID: props.testID,
    accessibilityLabel: props.accessibilityLabel,
    colorClassName: cn('bg-foreground', toneClass(props.tone)),
    blinking: props.pulse ?? false,
    className: cn(statusDotSizeClass(props.size), props.className),
  };
}

function statusDotSizeClass(size: StatusDotProps['size']): string {
  return size === 'sm' ? 'size-1.5 shrink-0' : 'size-2 shrink-0';
}
