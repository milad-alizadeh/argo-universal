import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ColumnPart,
  type ContentColumn,
  type PartLayout,
} from '#kit/content-column/content-column';
import { flattenedChildren } from '#kit/flattened-children';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { screenContentEnds, useScreenColumn } from './screen-column';
import type { ScreenHeaderInput } from './screen-props';

/*
 * One child fills the body. Several are parts of it, each keeping or claiming the column on its own, so a form's
 * FieldGroup fills the page while the Button below it keeps the page's gutter.
 */
export function ScreenBody(props: ScreenHeaderInput): ReactElement {
  const parts = flattenedChildren(props.children);

  if (parts.length < 2) return <BodyPart {...props} />;

  return <View className="min-h-0 flex-1">{screenParts(props, parts)}</View>;
}

const screenParts = (
  props: ScreenHeaderInput,
  parts: ReactNode[],
): ReactElement[] =>
  parts.map((part, index) => (
    <BodyPart
      key={partKey(part, index)}
      {...props}
      last={index === parts.length - 1}
    >
      {part}
    </BodyPart>
  ));

const partKey = (part: ReactNode, index: number): string =>
  isValidElement(part) && part.key !== null ? part.key : String(index);

type PartProps = ScreenHeaderInput & { last?: boolean };

/*
 * The content keeps to the heading's column. A scroll view that fills the body claims the column and keeps to it
 * itself, so its scrollbar and fades stay at the pane's edges, and grouped cards stand out of it by their rows' inset:
 * the body is then the whole pane. Anything else the body holds in the column itself.
 */
function BodyPart(props: PartProps): ReactElement {
  const column = useScreenColumn(props.width);

  return (
    <ColumnPart column={column}>
      {(layout) => <PartView {...props} column={column} layout={layout} />}
    </ColumnPart>
  );
}

type PartViewProps = PartProps & { column: ContentColumn; layout: PartLayout };

function PartView(props: PartViewProps): ReactElement {
  const end = useLastPartEnd(props.last);
  const style = props.layout.claimed ? undefined : { ...props.column, ...end };

  return (
    <View className={bodyClass(props, useWide())} style={style}>
      {props.children}
    </View>
  );
}

// The last of several parts ends this far above the home indicator or Android's navigation bar.
const partEnd = 24;

function useLastPartEnd(last: boolean | undefined): ViewStyle | undefined {
  const { bottom } = useSafeAreaInsets();

  return last ? { paddingBottom: bottom + partEnd } : undefined;
}

function bodyClass(props: PartViewProps, wide: boolean): string {
  const { claimed, filled } = props.layout;

  return cn(
    claimed ? claimedClass(props, filled) : unclaimedClass(props),
    props.last !== false && fabClearance(props, wide),
  );
}

// Alone, claimed content fills the body; as a part, only content that fills the height takes the room the others leave.
const claimedClass = (props: PartProps, filled: boolean): string =>
  props.last === undefined || filled ? 'min-h-0 flex-1' : 'min-h-0';

/*
 * Content that does not scroll sits in the column, a phone's small gap below its header. Alone it fills the body; as
 * one part of several it keeps its own height, and the last part ends above the home indicator.
 */
function unclaimedClass(props: PartProps): string {
  if (props.last === undefined)
    return cn('min-h-0 flex-1 w-full self-center', screenContentEnds);

  return 'w-full self-center pt-2 wide:pt-0';
}

const fabClearance = (props: PartProps, wide: boolean): string | false =>
  !wide && hasFab(props) && 'android:pb-safe-offset-22';

// Android's FAB, which the body's end clears.
const hasFab = (props: PartProps): boolean =>
  props.headers.native.primary !== undefined;
