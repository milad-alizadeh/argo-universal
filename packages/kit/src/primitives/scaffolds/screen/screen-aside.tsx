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
import { type AsidePlace, asidePlace, asideWidth } from './screen-aside-place';
import { ScreenColumn, useColumnTokens } from './screen-column';
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

interface AsideFrame {
  place: AsidePlace;
  onLayout: (event: LayoutChangeEvent) => void;
}

/*
 * Where the aside draws, from the Screen's own measured width. A page with no reading column to stand beside, `full`
 * or `bleed`, has no gutter, so its aside is always Pills.
 */
export function useAsideFrame(screenWidth: ScreenProps['width']): AsideFrame {
  const [width, setWidth] = useState(0);
  const tokens = useColumnTokens();
  const medium = Number.parseFloat(String(useCSSVariable('--breakpoint-medium')));
  const capped = screenWidth === undefined || screenWidth === 'content' || screenWidth === 'narrow';
  const column = screenWidth === 'narrow' ? tokens.narrow : tokens.column;
  const wide = useWide() && capped;
  const room = { width, wide, column, inset: tokens.inset, medium: medium || 0 };

  return {
    place: asidePlace(room),
    onLayout: (event) => setWidth(event.nativeEvent.layout.width),
  };
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
 * The aside's own column in the right gutter, beside the column and never moving it, from the top of the Screen. It
 * scrolls on its own, so a long list of values stays in reach while the content scrolls.
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
      <OutsideColumn>
        <ScrollFadeView contentContainerClassName="py-6">
          <MetadataPlaceContext value={props.place}>
            {props.children}
          </MetadataPlaceContext>
        </ScrollFadeView>
      </OutsideColumn>
    </View>
  );
}

// Content that scrolls none of its own leaves the aside's Pills to the Screen, between its heading and its body.
export function ScreenLead({
  width,
}: Pick<ScreenProps, 'width'>): ReactNode {
  const lead = use(AsideLeadContext);

  if (useLeadClaimed() || lead === null) return null;

  return (
    <ScreenColumn width={width === 'bleed' ? 'full' : width}>
      <View className="pt-2 pb-4 wide:pt-0">{lead}</View>
    </ScreenColumn>
  );
}
