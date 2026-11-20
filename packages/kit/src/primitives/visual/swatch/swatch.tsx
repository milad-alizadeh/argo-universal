import { useId, type ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { useIconPixels } from '../../../symbols/icon-size';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import type { KitProps } from '../../kit-props';

export type SwatchProps = KitProps<'Swatch'>;

// The drawing is 100 units wide: the dot fills the middle 60 and its glow the rest, so the glow overhangs the dot's slot.
const unit = 100;

const dotRadius = 30;

const glowRadius = 50;

const glowOpacity = 0.55;

const centre = unit / 2;

// The first stop is the highlight, at the upper left; the last reaches the dot's far edge.
const light = { x: 35, y: 30, reach: 55 };

const offsetOf = (index: number, count: number): number =>
  count === 1 ? 0 : index / (count - 1);

// An id that a `url(#…)` reference can hold.
const gradientId = (id: string, name: string): string =>
  `${name}-${id.replaceAll(/[^A-Za-z0-9]/g, '')}`;

/*
 * A round dot filled with a colour that is data (ADR-0026, Colour as data): its stops as a radial gradient lit from
 * the upper left, one stop solid, and a soft glow of the first colour around it. The colours draw as given in light
 * and dark mode; with none the dot is an empty muted one. react-native-svg draws it on every platform, so a native
 * FieldGroup row hosts it from React Native. The dot fills the row's leading glyph slot (row-glyph.ts).
 */
export function Swatch(props: SwatchProps): ReactElement {
  const slot = useIconPixels(rowGlyphSize);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={props.accessibilityLabel}
      style={{ width: slot, height: slot }}
    >
      <Drawing colors={props.colors} slot={slot} />
    </View>
  );
}

// The drawing is larger than the slot and centred on it, so its glow overhangs the slot.
const drawnSize = (slot: number): number => (slot * unit) / (2 * dotRadius);

const placement = (slot: number, size: number): ViewStyle => ({
  position: 'absolute',
  width: size,
  height: size,
  left: (slot - size) / 2,
  top: (slot - size) / 2,
});

function Drawing(props: {
  colors: SwatchProps['colors'];
  slot: number;
}): ReactElement {
  const size = drawnSize(props.slot);

  return (
    <View pointerEvents="none" style={placement(props.slot, size)}>
      <Svg width={size} height={size} viewBox={`0 0 ${unit} ${unit}`}>
        {props.colors ? <Colours colors={props.colors} /> : <EmptyDot />}
      </Svg>
    </View>
  );
}

function EmptyDot(): ReactElement {
  const fill = useResolveClassNames('bg-muted-hover').backgroundColor;

  return <Circle cx={centre} cy={centre} r={dotRadius} fill={fill} />;
}

function Colours(props: { colors: string[] }): ReactElement {
  const id = useId();
  const glow = gradientId(id, 'glow');
  const body = gradientId(id, 'dot');

  return (
    <>
      <Defs>
        <Glow id={glow} colour={props.colors[0]} />
        <Body id={body} colors={props.colors} />
      </Defs>
      <Circle cx={centre} cy={centre} r={glowRadius} fill={`url(#${glow})`} />
      <Circle cx={centre} cy={centre} r={dotRadius} fill={`url(#${body})`} />
    </>
  );
}

const gradientSpace = { gradientUnits: 'userSpaceOnUse' } as const;

const glowGradient = {
  cx: centre,
  cy: centre,
  r: glowRadius,
  ...gradientSpace,
};

function Glow(props: { id: string; colour: string | undefined }): ReactElement {
  const edge = dotRadius / glowRadius;

  return (
    <RadialGradient id={props.id} {...glowGradient}>
      <Stop offset={edge} stopColor={props.colour} stopOpacity={glowOpacity} />
      <Stop offset={1} stopColor={props.colour} stopOpacity={0} />
    </RadialGradient>
  );
}

const bodyGradient = {
  cx: light.x,
  cy: light.y,
  r: light.reach,
  ...gradientSpace,
};

function Body(props: { id: string; colors: string[] }): ReactElement {
  return (
    <RadialGradient id={props.id} {...bodyGradient}>
      {props.colors.map((color, index) => (
        <BodyStop
          key={`${color}-${String(index)}`}
          color={color}
          at={offsetOf(index, props.colors.length)}
        />
      ))}
    </RadialGradient>
  );
}

const BodyStop = (props: { color: string; at: number }): ReactElement => (
  <Stop offset={props.at} stopColor={props.color} />
);
