import { useWide } from '@repo/kit/use-wide/use-wide';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { Ref } from 'react';
import { type ViewProps, View, type ViewInstance } from 'react-native';
import { columnGutter } from './content-rule';
import { filledClass } from './session-fill';
import { useContentRule } from './use-content-rule';

// The one surface a Session sits on, the same on a phone and in a window. The screen and the Feed's native fades take it from here.
export const sessionSurface = 'bg-content';

type SessionColumnProps = ViewProps & {
  ref?: Ref<ViewInstance>;
  fill?: boolean;
  // The column gives its height up to the box it sits in, rather than running past the bottom of it.
  shrink?: boolean;
};

type ColumnPaneProps = Pick<
  SessionColumnProps,
  'fill' | 'shrink' | 'pointerEvents' | 'children'
>;

const shrinkClass = 'min-h-0 shrink';

const paneClassName = ({ shrink, fill }: ColumnPaneProps): string =>
  cn('w-full', shrink && shrinkClass, fill && filledClass);

// The pane's side padding, the content rule's gutter at the window's Size class.
function ColumnPane(props: ColumnPaneProps): React.JSX.Element {
  const gutter = columnGutter(useContentRule(), useWide());

  return (
    <View
      pointerEvents={props.pointerEvents}
      className={paneClassName(props)}
      style={{ paddingHorizontal: gutter }}
    >
      {props.children}
    </View>
  );
}

function ColumnBody(props: ViewProps): React.JSX.Element {
  const { maximum } = useContentRule();
  const className = cn('w-full self-center', props.className);

  return (
    <View
      {...props}
      className={className}
      style={[{ maxWidth: maximum }, props.style]}
    >
      {props.children}
    </View>
  );
}

// The Session's one column: as wide as the content rule allows, centred in the pane with the pane's side padding. CSS centres it on every width change, so nothing in it depends on a width measured earlier.
export function SessionColumn({
  fill,
  shrink,
  ...props
}: SessionColumnProps): React.JSX.Element {
  return (
    <ColumnPane fill={fill} shrink={shrink} pointerEvents={props.pointerEvents}>
      <ColumnBody {...props} />
    </ColumnPane>
  );
}

/*
 * A filled column runs the pane's height, as a plan read full page does. The Composer's column always gives
 * its height up: laid over the Feed's end, it has only the room above the keyboard to draw in (#1529).
 */
export function ComposerColumn(
  props: Pick<ViewProps, 'onLayout' | 'children'> & {
    ref?: Ref<ViewInstance>;
    fill?: boolean;
  },
): React.JSX.Element {
  return (
    <SessionColumn
      {...props}
      shrink
      testID="composer-column"
      className={cn('items-center', shrinkClass, props.fill && filledClass)}
    />
  );
}
