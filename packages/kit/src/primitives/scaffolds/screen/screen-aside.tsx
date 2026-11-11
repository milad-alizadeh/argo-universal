import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useState,
} from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import {
  OutsideColumn,
  useClaimLead,
  useLeadClaimed,
} from '#kit/content-column/content-column';
import { useWide } from '#kit/use-wide/use-wide';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { MetadataPlaceContext } from '../metadata/metadata-drawing-context';
import {
  type AsideLayout,
  type AsidePlace,
  type AsideRoom,
  asideLayout,
  asideWidth,
} from './screen-aside-place';
import { insetWidth, ScreenColumn, useColumnTokens } from './screen-column';
import type { ScreenProps } from './screen-props';

// The aside's Pills, for the content that scrolls to draw at its top; null when the aside has its own column.
const AsideLeadContext = createContext<ReactNode>(null);

/*
 * Content that scrolls, a Detail, draws the aside's Pills at its top, so they scroll away with it as the page's first
 * lines. It claims them, and the Screen then draws no strip of its own.
 */
export function useAsideLead(): ReactNode {
  const lead = use(AsideLeadContext);
  useClaimLead(lead !== null);

  return lead;
}

interface AsideFrame extends AsideLayout {
  onLayout: (event: LayoutChangeEvent) => void;
}

/*
 * The width the last Screen measured. A page opened from another starts from it, as the two fill the same region, so
 * its first frame lays its column out where the page it came from had it, not centred until it measures its own.
 */
let lastScreenWidth = 0;

/*
 * Where the aside draws, and where the column sits beside it, from the Screen's own measured width. A page with no
 * reading column to stand beside, `full` or `bleed`, has no gutter, so its aside is always Pills.
 */
export function useAsideFrame(screenWidth: ScreenProps['width']): AsideFrame {
  const [width, setWidth] = useState(lastScreenWidth);
  const room = useAsideRoom(screenWidth);

  return {
    ...asideLayout({ ...room, width }),
    onLayout: (event) => {
      lastScreenWidth = event.nativeEvent.layout.width;
      setWidth(lastScreenWidth);
    },
  };
}

// The widths a reading column is capped at, so the gutters beside it can hold an aside.
const cappedWidths = new Set<ScreenProps['width']>([undefined, 'content']);

function useAsideRoom(
  screenWidth: ScreenProps['width'],
): Omit<AsideRoom, 'width'> {
  const tokens = useColumnTokens();
  const medium = useMediumWidth();
  const wide = useWide();

  return {
    wide: wide && cappedWidths.has(screenWidth),
    column: tokens.column,
    inset: tokens.inset,
    medium,
  };
}

// The medium Size class threshold; 0 where the token is missing, so Pills keep their words.
function useMediumWidth(): number {
  const medium = Number.parseFloat(
    String(useCSSVariable('--breakpoint-medium')),
  );

  return Number.isNaN(medium) ? 0 : medium;
}

type AsideProps = Pick<ScreenProps, 'aside' | 'width'> & {
  place: AsidePlace;
  children: ReactNode;
};

// The Screen's aside, handed to the Metadata it holds with where it draws.
export function ScreenAside(props: AsideProps): ReactElement {
  const lead = leadOf(props);

  return (
    <AsideLeadContext value={lead}>
      {props.children}
      {props.aside && props.place === 'aside' ? (
        <AsideColumn place={props.place}>{props.aside}</AsideColumn>
      ) : null}
    </AsideLeadContext>
  );
}

function leadOf({ aside, place }: AsideProps): ReactNode {
  if (!aside || place === 'aside') return null;

  return <MetadataPlaceContext value={place}>{aside}</MetadataPlaceContext>;
}

/*
 * The aside's own column at the trailing edge, beside the reading column that leaves it room, from the top of the
 * Screen. It scrolls on its own, so a long list of values stays in reach while the content scrolls.
 */
function AsideColumn(props: {
  place: AsidePlace;
  children: ReactNode;
}): ReactElement {
  const { inset } = useColumnTokens();

  return (
    <View
      className="absolute top-0 bottom-0"
      style={{ right: inset, width: asideWidth }}
    >
      <AsideScroll {...props} />
    </View>
  );
}

function AsideScroll(props: {
  place: AsidePlace;
  children: ReactNode;
}): ReactElement {
  return (
    <OutsideColumn>
      <ScrollFadeView contentContainerClassName="py-6">
        <MetadataPlaceContext value={props.place}>
          {props.children}
        </MetadataPlaceContext>
      </ScrollFadeView>
    </OutsideColumn>
  );
}

// Content that scrolls none of its own leaves the aside's Pills to the Screen, between its heading and its body.
export function ScreenLead({ width }: Pick<ScreenProps, 'width'>): ReactNode {
  const lead = use(AsideLeadContext);
  const shown = !useLeadClaimed() && lead !== null;

  return shown ? <LeadStrip width={width}>{lead}</LeadStrip> : null;
}

function LeadStrip({
  width,
  children,
}: Pick<ScreenProps, 'width'> & { children: ReactNode }): ReactElement {
  return (
    <ScreenColumn width={insetWidth(width)}>
      <View className="pt-2 pb-4 wide:pt-0">{children}</View>
    </ScreenColumn>
  );
}
