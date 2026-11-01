import type * as React from 'react';
import { View } from 'react-native';
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
  return (
    <PinnedFooterKeyboard>
      <View className="min-h-0 flex-1 justify-between gap-4 p-4">
        <View className="min-h-0 flex-1 gap-2">{props.children}</View>
        <View className="gap-2">{props.footer}</View>
      </View>
    </PinnedFooterKeyboard>
  );
}
