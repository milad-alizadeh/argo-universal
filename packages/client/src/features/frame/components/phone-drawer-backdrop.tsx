import type * as React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

// Paper's phone "SidebarBackdrop / Warm frost (contained)": the desktop glows, smaller, behind the drawer's glass.
interface Glow {
  colour: 'warm' | 'graphite' | 'sand';
  left: number;
  top: number;
  size: number;
  // Opacity of the glow colour at each offset along the radius.
  stops: readonly { opacity: number; offset: number }[];
}

const glows: readonly Glow[] = [
  {
    colour: 'warm',
    left: -308,
    top: -225,
    size: 675,
    stops: [
      { opacity: 0.16, offset: 0 },
      { opacity: 0.06, offset: 0.3 },
      { opacity: 0, offset: 0.62 },
    ],
  },
  {
    colour: 'graphite',
    left: -195,
    top: 248,
    size: 480,
    stops: [
      { opacity: 0.06, offset: 0 },
      { opacity: 0, offset: 0.66 },
    ],
  },
  {
    colour: 'sand',
    left: -173,
    top: 544,
    size: 525,
    stops: [
      { opacity: 0.12, offset: 0 },
      { opacity: 0, offset: 0.64 },
    ],
  },
];

const edgeFadeWidth = 42;

// Static, so the drawer's slide moves only the card above it and never repaints the glow.
export function PhoneDrawerBackdrop({
  width,
}: {
  width: number;
}): React.JSX.Element {
  const [warm, graphite, sand, surface] = useCSSVariable([
    '--color-glow-warm',
    '--color-glow-graphite',
    '--color-glow-sand',
    '--color-sidebar',
  ]);
  const colours = { warm, graphite, sand };
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute bottom-0 left-0 top-0 overflow-hidden"
      style={{ width }}
    >
      <Svg width={width} height="100%">
        <Defs>
          {glows.map((glow) => (
            <RadialGradient
              key={glow.colour}
              id={`phone-glow-${glow.colour}`}
              gradientUnits="userSpaceOnUse"
              cx={glow.left + glow.size / 2}
              cy={glow.top + glow.size / 2}
              // CSS "circle farthest-corner" on a square: half its diagonal.
              r={(glow.size / 2) * Math.SQRT2}
            >
              {glow.stops.map(({ opacity, offset }) => (
                <Stop
                  key={offset}
                  offset={offset}
                  stopColor={String(colours[glow.colour])}
                  stopOpacity={opacity}
                />
              ))}
            </RadialGradient>
          ))}
          <LinearGradient id="phone-glow-edge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset={0} stopColor={String(surface)} stopOpacity={0} />
            <Stop offset={1} stopColor={String(surface)} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        {glows.map((glow) => (
          <Rect
            key={glow.colour}
            x={glow.left}
            y={glow.top}
            width={glow.size}
            height={glow.size}
            fill={`url(#phone-glow-${glow.colour})`}
          />
        ))}
        <Rect
          x={width - edgeFadeWidth}
          y={0}
          width={edgeFadeWidth}
          height="100%"
          fill="url(#phone-glow-edge)"
        />
      </Svg>
    </View>
  );
}
