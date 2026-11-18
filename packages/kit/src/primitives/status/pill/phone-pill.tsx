import type * as React from 'react';
import { Pressable } from 'react-native';
import { cn } from '#kit/utils';
import { LiquidGlass } from '#primitives/content/liquid-glass';

// One surface and touch target for the pills above a phone's Composer.
export function PhonePill({
  children,
  ...props
}: React.ComponentProps<typeof Pressable>): React.JSX.Element {
  const className = phonePillClass(props.disabled);

  return (
    <LiquidGlass corners="pill" interactive inherit className="h-8">
      <Pressable {...props} hitSlop={6} className={className}>
        {children}
      </Pressable>
    </LiquidGlass>
  );
}

const phonePillClass = (disabled: boolean | null | undefined): string =>
  cn(
    'h-8 flex-row items-center gap-2 rounded-full pr-3.5 pl-3 active:opacity-70',
    disabled && 'opacity-35',
  );
