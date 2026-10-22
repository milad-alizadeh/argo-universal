import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { Ref } from 'react';
import { type ViewProps, View, type ViewInstance } from 'react-native';
import { filledClass } from './session-fill';

// The one surface a Session sits on, the same on a phone and in a window. The screen and the Feed's native fades take it from here.
export const sessionSurface = 'bg-content';

const paneClass = (fill: boolean | undefined): string =>
  cn('w-full px-4 wide:px-6', fill && filledClass);

// The Session's one column: as wide as the Composer at most, centred in the pane with the pane's side padding. CSS centres it on every width change, so nothing in it depends on a width measured earlier.
export function SessionColumn({
  fill,
  ...props
}: ViewProps & { ref?: Ref<ViewInstance>; fill?: boolean }): React.JSX.Element {
  return (
    <View pointerEvents={props.pointerEvents} className={paneClass(fill)}>
      <View
        {...props}
        className={cn('w-full max-w-column self-center', props.className)}
      >
        {props.children}
      </View>
    </View>
  );
}

// A filled column runs the pane's height, as a plan read full page does.
export function ComposerColumn(
  props: Pick<ViewProps, 'onLayout' | 'children'> & {
    ref?: Ref<ViewInstance>;
    fill?: boolean;
  },
): React.JSX.Element {
  return (
    <SessionColumn
      {...props}
      testID="composer-column"
      className={cn('items-center', props.fill && filledClass)}
    />
  );
}
