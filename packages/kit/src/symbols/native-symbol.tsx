import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { Icon, IconSlot, useIconSize } from '#primitives/content/icon';
import { NativeIcon } from './native-icon';
import type {
  NativeSymbolProps,
  NativeSymbolTone,
} from './native-symbol-props';
import { glyphForegroundClass } from './row-glyph';

function toneClassName(tone: NativeSymbolTone | undefined): string | undefined {
  if (tone === 'muted') return 'text-muted-foreground';

  return tone === 'foreground' ? glyphForegroundClass : undefined;
}

// The token the symbol draws in; unset, it keeps the content colour of the Compose control around it.
function useToneColor(tone: NativeSymbolTone | undefined): string | undefined {
  const { foreground, mutedForeground } = useNativeTheme().colors;

  if (tone === 'foreground') return foreground;

  return tone === 'muted' ? mutedForeground : undefined;
}

/*
 * An Argo icon inside a Compose tree: Expo UI's Icon in the token the tone names, or the control's content colour.
 * A row's lane needs no share here — stock Android Settings draws the standard 24dp Material box, which is what the
 * size table already gives a row (glyph-sizing.ts) — so the lane is dropped rather than passed on.
 */
export function NativeSymbol({
  lane: _lane,
  ...props
}: NativeSymbolProps): React.JSX.Element {
  return (
    <NativeIcon
      {...props}
      color={useToneColor(props.tone)}
      fallback={<HostedSymbol {...props} />}
    />
  );
}

const hostedIconSlot = {
  collapsable: false,
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

// An icon Expo UI cannot draw, hosted as a React Native view; the row it sits in names it for screen readers.
function HostedSymbol({
  tone,
  ...props
}: NativeSymbolProps): React.JSX.Element {
  const size = useIconSize(props.size);

  return (
    <RNHostView matchContents>
      <IconSlot size={size} {...hostedIconSlot}>
        <Icon {...props} size={size} className={toneClassName(tone)} />
      </IconSlot>
    </RNHostView>
  );
}
