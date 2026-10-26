import { use, type ReactElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  HeadingInsetContext,
  useClaimsColumn,
  useColumnClaimed,
  useHeadingInsetScope,
} from '#kit/heading-inset';
import { ScrollColumnContext } from '#kit/scroll-column';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { ActionShortcutScope } from '#primitives/actions/action';
import { SvgBudget } from '#primitives/visual';
import { ScreenAccessory } from './screen-accessory';
import { screenContentEnds, useScreenColumn } from './screen-column';
import { ScreenHeading } from './screen-heading';
import { useListColumnHeading } from './screen-list-column';
import { ListColumnScreen } from './screen-list-column-screen';
import { ScreenNavigation } from './screen-navigation';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useScreenHeader } from './use-screen-header';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  // A Screen inside another's content keeps its own column, so the outer one leaves it unpadded.
  useClaimsColumn(true);

  return (
    <SvgBudget>
      <ActionShortcutScope>
        <HeadingInsetScope>
          <ScreenSurface {...props} />
        </HeadingInsetScope>
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The Screen's heading learns from its content whether that is grouped cards.
function HeadingInsetScope(props: { children: ReactNode }): ReactElement {
  return (
    <HeadingInsetContext value={useHeadingInsetScope()}>
      {props.children}
    </HeadingInsetContext>
  );
}

// A Screen in a list column hands its heading up to the column; any other draws its own.
function ScreenSurface(props: ScreenProps): ReactElement {
  const heading = useListColumnHeading();

  if (heading) return <ListColumnScreen {...props} heading={heading} />;

  return <PageSurface {...props} />;
}

// The Screen declares its header from its props; its content adds none.
function PageSurface(props: ScreenProps): ReactElement {
  const header = useScreenHeader(props);

  // Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <ShortcutAnchors header={header} />
      <ScreenNavigation {...props} header={header} />
      <ScreenHeading {...props} header={header} />
      <ScreenBody {...props} />
      <ScreenAccessory {...props} />
    </View>
  );
}

function ScreenBody(props: ScreenProps): ReactElement {
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
function useScreenBody(props: ScreenProps): ScreenBodyStyle {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);
  const column = useScreenColumn(props.width);
  const claimed = useColumnClaimed();

  return {
    column: wide ? claimedColumn(column, claimed) : inherited,
    className: bodyClass(props, wide, claimed),
    style: claimed ? undefined : column,
  };
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

function bodyClass(
  props: ScreenProps,
  wide: boolean,
  claimed: boolean,
): string {
  return cn(
    'min-h-0 flex-1',
    !claimed && cn('w-full self-center', screenContentEnds),
    fabClearance(props, wide),
  );
}

const fabClearance = (props: ScreenProps, wide: boolean): string | false =>
  !wide && hasFab(props) && 'android:pb-safe-offset-22';

// Android's FAB, which the body's end clears; an unavailable primary Action shows none.
function hasFab(props: ScreenProps): boolean {
  const action = screenPrimaryAction(props);

  return Boolean(action && !action.disabled);
}
