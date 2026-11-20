import { Children, useState, type ReactElement, type ReactNode } from 'react';
import { type LayoutRectangle, View } from 'react-native';
import {
  SecondaryTextClassContext,
  TextClassContext,
} from '#primitives/content/text';
import { isRightToLeft } from './fader-direction';
import { inkOver, type Ink } from './fader-ink';
import { fractionOf } from './fader-math';
import type { FaderProps } from './fader-props';

type Orientation = NonNullable<FaderProps['orientation']>;

// The content's children spread along the surface: a column from top to bottom, a row from the leading edge to the trailing one.
const contentClass = {
  vertical: 'flex-1 justify-between p-4',
  horizontal: 'flex-1 flex-row items-center justify-between gap-3 px-4',
} as const satisfies Record<Orientation, string>;

interface InkClasses {
  text: string | undefined;
  secondary: string | undefined;
}

// The ink, and the same ink at reduced emphasis for the secondary role.
const inkClass = {
  dark: { text: 'text-ink-on-light', secondary: 'text-ink-on-light/70' },
  light: { text: 'text-ink-on-dark', secondary: 'text-ink-on-dark/70' },
} as const satisfies Record<Ink, InkClasses>;

const accentInk = {
  text: 'text-primary-foreground',
  secondary: 'text-primary-foreground/70',
};

// Over the unfilled part the text keeps its normal colours.
const plainInk: InkClasses = { text: undefined, secondary: undefined };

// The ink over the fill, from its colours; over the accent tone, the one that pairs with it.
const inkOf = (fill: FaderProps['fill']): InkClasses =>
  fill ? inkClass[inkOver(fill)] : accentInk;

const centreOf = (box: LayoutRectangle, orientation: Orientation): number =>
  orientation === 'vertical' ? box.y + box.height / 2 : box.x + box.width / 2;

const lengthOf = (frame: LayoutRectangle, orientation: Orientation): number =>
  orientation === 'vertical' ? frame.height : frame.width;

// A vertical fill starts at the bottom, a horizontal one at the leading edge.
const startsAtFarEnd = (orientation: Orientation): boolean =>
  orientation === 'vertical' || isRightToLeft();

interface Zone {
  frame: LayoutRectangle;
  orientation: Orientation;
  share: number;
}

// Whether the fill reaches under the middle of a piece of content.
function underFill(box: LayoutRectangle, zone: Zone): boolean {
  const length = lengthOf(zone.frame, zone.orientation);
  const at = centreOf(box, zone.orientation);
  const distance = startsAtFarEnd(zone.orientation) ? length - at : at;

  return distance <= zone.share * length;
}

// Each piece of content takes the ink of the surface behind it: the fill's where the fill reaches it, its own otherwise.
function InkZone(
  props: Zone & { ink: InkClasses; children: ReactNode },
): ReactElement {
  const [box, setBox] = useState<LayoutRectangle>();
  const ink = box && underFill(box, props) ? props.ink : plainInk;

  return (
    <View onLayout={(event) => setBox(event.nativeEvent.layout)}>
      <TextClassContext value={ink.text}>
        <SecondaryTextClassContext value={ink.secondary}>
          {props.children}
        </SecondaryTextClassContext>
      </TextClassContext>
    </View>
  );
}

const unmeasured = { x: 0, y: 0, width: 0, height: 0 };

type ContentProps = FaderProps & {
  orientation: Orientation;
  // The value on screen, which may be a draft.
  shown: number;
};

function Zones(props: ContentProps & { frame: LayoutRectangle }): ReactNode {
  const { frame, orientation } = props;
  const share = fractionOf(props.shown, props);
  const ink = inkOf(props.fill);

  return Children.map(props.children, (child) => (
    <InkZone ink={ink} {...{ frame, orientation, share }}>
      {child}
    </InkZone>
  ));
}

export function Content(props: ContentProps): ReactElement {
  const [frame, setFrame] = useState(unmeasured);

  return (
    <View
      pointerEvents="box-none"
      className={contentClass[props.orientation]}
      onLayout={(event) => setFrame(event.nativeEvent.layout)}
    >
      <Zones {...props} frame={frame} />
    </View>
  );
}
