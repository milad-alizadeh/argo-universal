import type { IconName } from '@repo/contracts/kit-symbols';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { Spinner } from '#primitives/status/spinner';

export type GlyphTone = 'info' | 'warning' | 'neutral';

export interface GlyphTileProps {
  tone: GlyphTone;
  // The glyph; a tile with none shows a spinner, for a page that waits.
  icon?: IconName;
}

const tones = {
  info: 'bg-tone-info-100 text-tone-info-600',
  warning: 'bg-tone-warning-100 text-tone-warning-700',
  neutral: 'bg-muted text-foreground',
} as const satisfies Record<GlyphTone, string>;

const tile = 'size-13 shrink-0 items-center justify-center rounded-xl';

/*
 * The tinted square that leads a pairing sheet: a glyph in the tone of what the sheet says, or a spinner while it looks.
 */
export function GlyphTile(props: GlyphTileProps): React.JSX.Element {
  return (
    <View className={cn(tile, tones[props.tone])}>
      {props.icon ? (
        <Icon name={props.icon} size="lg" />
      ) : (
        <Spinner accessibilityLabel="Working" />
      )}
    </View>
  );
}
