import type * as React from 'react';
import { View } from 'react-native';
import { useFloatingHeaderHeight } from '#kit/floating-header';
import { PinnedFooterKeyboard } from './pinned-footer-keyboard';

export interface PinnedFooterProps {
  // The page's content, from the top.
  children: React.ReactNode;
  // What stays at the foot of the page whatever the content's height, such as the one button that finishes a form.
  footer: React.ReactNode;
}

/*
 * A Screen's one body part with a footer held at its foot, in the page's gutter (Add a Server's "Enter code", #1490). App-only: a Plugin's Screen has no footer to pin.
 */
export function PinnedFooter(props: PinnedFooterProps): React.JSX.Element {
  // Not a scroll view, so iOS does not move it below a header that floats over the page; it starts there itself.
  const top = useFloatingHeaderHeight();

  return (
    <PinnedFooterKeyboard>
      <View
        className="min-h-0 flex-1 justify-between gap-4 p-4"
        style={top > 0 ? { marginTop: top } : undefined}
      >
        <View className="min-h-0 flex-1 gap-2">{props.children}</View>
        <View className="gap-2">{props.footer}</View>
      </View>
    </PinnedFooterKeyboard>
  );
}
