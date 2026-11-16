import type * as React from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';

interface ViewerBarProps {
  title: string;
  onFit: () => void;
  onClose: () => void;
}

const quiet = { size: 'sm', variant: 'ghost', muted: true } as const;

const fit = {
  ...quiet,
  icon: 'zoom-out',
  accessibilityLabel: 'Fit to screen',
} as const;

const close = { ...quiet, icon: 'close', accessibilityLabel: 'Close' } as const;

function BarTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <Text role="heading" aria-level={2} numberOfLines={1} className="flex-1">
      {title}
    </Text>
  );
}

// The full-screen diagram's title, with Fit and Close.
export function ViewerBar(props: ViewerBarProps): React.JSX.Element {
  return (
    <View className="h-12 shrink-0 flex-row items-center gap-1 border-b border-border px-3">
      <BarTitle title={props.title} />
      <IconButton {...fit} onPress={props.onFit} />
      <IconButton {...close} onPress={props.onClose} />
    </View>
  );
}
