import {
  createContext,
  use,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { useSidebarGutterHeld } from '#kit/sidebar-gutter';
import { ScreenNavigationEnabled } from './screen-navigation-context';

/*
 * The heading a Screen in a list column hands up to the column's top row, drawn there instead of in the Screen's own
 * place: a list column is a Screen's content with its heading above it, as a page's is. The column is part of the
 * Screen's own page, so it is not offered through `createPlaceOffer`: the heading is claimed whenever the column is drawn.
 */
const ListColumnHeadingContext = createContext<Place<ReactNode> | undefined>(
  undefined,
);

// The column the Screen is the content of, if any; what a Screen inside that Screen's own content sees is a page's.
export const useListColumnHeading = (): Place<ReactNode> | undefined =>
  use(ListColumnHeadingContext);

// What a Screen's content sees, so a Screen nested in a list Screen's content is a page and draws its own heading.
export function ScreenInPage(props: { children: ReactNode }): ReactElement {
  return (
    <ListColumnHeadingContext value={undefined}>
      {props.children}
    </ListColumnHeadingContext>
  );
}

export interface ScreenListColumnProps {
  /*
   * The column starts under the window's band, as the Frame's sidebar does, so its heading row is always there, empty
   * for a list that has no Screen, and a tablet's drops by the status bar's inset.
   */
  underBand?: boolean;
  children: ReactNode;
}

/*
 * Kit-only. A list beside its page, such as the Frame's sidebar or a ListDetail's own pane. The Screen around the list
 * declares its header as any Screen does, and is drawn here in the column's top row in the list's looks, its title a
 * level down, its buttons small and its search the sidebar's; a column has no Screen header of its own to draw.
 */
export function ScreenListColumn(props: ScreenListColumnProps): ReactElement {
  const [heading] = useState(() => createPlace<ReactNode>());

  return (
    <ListColumnHeadingContext value={heading}>
      <ScreenNavigationEnabled value={false}>
        <View className="min-h-0 flex-1">
          <ColumnHeadingRow heading={heading} underBand={props.underBand} />
          {props.children}
        </View>
      </ScreenNavigationEnabled>
    </ListColumnHeadingContext>
  );
}

const startsOnRowText = 'pl-6';

const startsOnFrameRowText = 'pl-4';

const endsClearOfScrollbar = 'pr-3.5';

const rowClassName = `min-h-frame-control flex-row items-center ${startsOnRowText} ${endsClearOfScrollbar}`;

/*
 * Under the band the heading is centred on the rail's first tile, which the desktop rail draws 8 below the band and
 * 40 tall (`web:pt-2` and `size-10` in the Frame's rail), so the row is that tile with 8 above and below it.
 */
const bandRowClassName = `web:h-14 native:min-h-frame-control flex-row items-center ${startsOnRowText} ${endsClearOfScrollbar} native:mt-4 native:pt-1`;

const rowClass = (underBand: boolean | undefined, held: boolean): string => {
  const original = underBand ? bandRowClassName : rowClassName;

  return held
    ? original.replace(startsOnRowText, startsOnFrameRowText)
    : original;
};

// The row is there for a heading, or always under the band, where the list starts below it.
const rowShown = (claimed: ReactNode, underBand?: boolean): boolean =>
  Boolean(claimed) || Boolean(underBand);

function ColumnHeadingRow(props: {
  heading: Place<ReactNode>;
  underBand?: boolean;
}): ReactElement | null {
  const claimed = useClaimed(props.heading);
  const held = useSidebarGutterHeld();

  if (!rowShown(claimed, props.underBand)) return null;

  return (
    <HeadingRow className={rowClass(props.underBand, held)}>
      {claimed}
    </HeadingRow>
  );
}

function HeadingRow(props: {
  className: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View testID="list-column-heading" className={props.className}>
      <View className="min-w-0 flex-1">{props.children}</View>
    </View>
  );
}
