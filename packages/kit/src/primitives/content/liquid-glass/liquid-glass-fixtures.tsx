import type * as React from 'react';
import { Text } from '#primitives/content/text';
import type { LiquidGlassProps } from './liquid-glass-props';

function GlassText({ text }: { text: string }): React.JSX.Element {
  return (
    <Text role="body" className="px-4 py-1">
      {text}
    </Text>
  );
}

export const sheetLiquidGlass = {
  children: <GlassText text="Message" />,
  corners: 'sheet',
  className: 'w-full',
  fallbackClassName: 'rounded-2xl bg-card shadow-glass',
} satisfies LiquidGlassProps;

export const pillLiquidGlass = {
  children: <GlassText text="Label" />,
  corners: 'pill',
  interactive: true,
  className: 'h-6 justify-center self-start',
  fallbackClassName: 'rounded-full border border-border bg-card shadow-card',
} satisfies LiquidGlassProps;
