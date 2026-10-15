import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';

// The one surface a Session sits on, the same on a phone and in a window. The screen and the Feed's native fades take it from here.
export const sessionSurface = 'bg-content';

// The Session's one column: as wide as the Composer at most, centred in the pane with the pane's side padding. CSS centres it on every width change, so nothing in it depends on a width measured earlier.
export function SessionColumn(props: ViewProps): React.JSX.Element {
  return (
    <View pointerEvents={props.pointerEvents} className="w-full px-4 wide:px-6">
      <View
        {...props}
        className={cn('w-full max-w-column self-center', props.className)}
      >
        {props.children}
      </View>
    </View>
  );
}

export function ComposerColumn(
  props: Pick<ViewProps, 'onLayout' | 'children'>,
): React.JSX.Element {
  return (
    <SessionColumn
      testID="composer-column"
      className="items-center"
      onLayout={props.onLayout}
    >
      {props.children}
    </SessionColumn>
  );
}
