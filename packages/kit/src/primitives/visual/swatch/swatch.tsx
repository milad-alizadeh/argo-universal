import { useId, type ReactElement } from 'react';
import { View } from 'react-native';
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

const offsets = (count: number): number[] =>
  Array.from({ length: count }, (_, index) =>
    count === 1 ? 0 : index / (count - 1),
  );

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
  const size = (slot * unit) / (2 * dotRadius);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={props.accessibilityLabel}
      style={{ width: slot, height: slot }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: (slot - size) / 2,
          top: (slot - size) / 2,
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${unit} ${unit}`}>
          {props.colors ? (
            <Colours colors={props.colors} />
          ) : (
            <EmptyDot />
          )}
        </Svg>
      </View>
    </View>
  );
}

function EmptyDot(): ReactElement {
  const fill = useResolveClassNames('bg-neutral-200').backgroundColor;

  return <Circle cx={centre} cy={centre} r={dotRadius} fill={fill as string} />;
}

function Colours(props: { colors: string[] }): ReactElement {
  const id = useId();
  const glow = gradientId(id, 'glow');
  const body = gradientId(id, 'dot');
  const first = props.colors[0];

  return (
    <>
      <Defs>
        <RadialGradient id={glow} cx={centre} cy={centre} r={glowRadius} gradientUnits="userSpaceOnUse">
          <Stop offset={dotRadius / glowRadius} stopColor={first} stopOpacity={glowOpacity} />
          <Stop offset={1} stopColor={first} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={body} cx={35} cy={30} r={55} gradientUnits="userSpaceOnUse">
          {props.colors.map((color, index) => (
            <Stop
              // oxlint-disable-next-line react/no-array-index-key -- stops have no identity but their place.
              key={index}
              offset={offsets(props.colors.length)[index]}
              stopColor={color}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={centre} cy={centre} r={glowRadius} fill={`url(#${glow})`} />
      <Circle cx={centre} cy={centre} r={dotRadius} fill={props.colors.length === 1 ? first : `url(#${body})`} />
    </>
  );
}
