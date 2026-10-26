import { isValidElement, use, type ReactElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColumnClaimed, useColumnFilled } from '#kit/column-claims';
import { flattenedChildren } from '#kit/flattened-children';
import { HeadingInsetContext, useBodyPartScope } from '#kit/heading-inset';
import { ScrollColumnContext } from '#kit/scroll-column';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { screenContentEnds, useScreenColumn } from './screen-column';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenProps } from './screen-props';

/*
 * One child fills the body. Several are parts of it, each keeping or claiming the column on its own, so a form's
 * FieldGroup fills the page while the Button below it keeps the page's gutter.
 */
export function ScreenBody(props: ScreenProps): ReactElement {
  const parts = flattenedChildren(props.children);

  if (parts.length < 2) return <BodyPart {...props} />;

  return <View className="min-h-0 flex-1">{screenParts(props, parts)}</View>;
}

const screenParts = (props: ScreenProps, parts: ReactNode[]): ReactElement[] =>
  parts.map((part, index) => (
    <ScreenPart
      key={partKey(part, index)}
      {...props}
      last={index === parts.length - 1}
    >
      {part}
    </ScreenPart>
  ));

const partKey = (part: ReactNode, index: number): string =>
  isValidElement(part) && part.key !== null ? part.key : String(index);

type PartProps = ScreenProps & { last?: boolean };

function ScreenPart(props: PartProps): ReactElement {
  return (
    <HeadingInsetContext value={useBodyPartScope()}>
      <BodyPart {...props} />
    </HeadingInsetContext>
  );
}

function BodyPart(props: PartProps): ReactElement {
  const { column, className, style } = useScreenBody(props);

  return (
    <View className={className} style={style}>
      <ScrollColumnContext value={column}>{props.children}</ScrollColumnContext>
    </View>
  );
}

/*
 * The content keeps to the heading's column. A scroll view that fills the body takes the column as
 * ScrollColumnContext, so its scrollbar and fades stay at the pane's edges, and grouped cards stand out of it by their
 * rows' inset: those claim it, and the body is the whole pane. Anything else the body holds in the column itself. A
 * phone's scroll views and grouped cards keep their platform's insets; only what does not scroll takes its margins.
 */
function useScreenBody(props: PartProps): ScreenBodyStyle {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);
  const column = useScreenColumn(props.width);
  const claimed = useColumnClaimed();
  const filled = useColumnFilled();
  const end = useLastPartEnd(props.last);

  return {
    column: wide ? claimedColumn(column, claimed) : inherited,
    className: bodyClass(props, wide, { claimed, filled }),
    style: claimed ? undefined : { ...column, ...end },
  };
}

// The last of several parts ends this far above the home indicator or Android's navigation bar.
const partEnd = 24;

function useLastPartEnd(last: boolean | undefined): ViewStyle | undefined {
  const { bottom } = useSafeAreaInsets();

  return last ? { paddingBottom: bottom + partEnd } : undefined;
}

// Only content that claims the column takes it; once the body holds it, nothing inside takes it again.
const claimedColumn = (
  column: ScreenBodyStyle['column'],
  claimed: boolean,
): ScreenBodyStyle['column'] => (claimed ? column : undefined);

interface ScreenBodyStyle {
  column: React.ContextType<typeof ScrollColumnContext>;
  className: string;
  style?: ViewStyle;
}

type BodyFill = { claimed: boolean; filled: boolean };

function bodyClass(props: PartProps, wide: boolean, fill: BodyFill): string {
  return cn(
    fill.claimed ? claimedClass(props, fill.filled) : unclaimedClass(props),
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

const fabClearance = (props: ScreenProps, wide: boolean): string | false =>
  !wide && hasFab(props) && 'android:pb-safe-offset-22';

// Android's FAB, which the body's end clears; an unavailable primary Action shows none.
function hasFab(props: ScreenProps): boolean {
  const action = screenPrimaryAction(props);

  return Boolean(action && !action.disabled);
}
