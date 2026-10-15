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
import {
  type Glow,
  type GlowStop,
  sidebarGlows,
  useGlowColours,
} from '../sidebar-glows';

const { glows, edgeFadeWidth } = sidebarGlows('phone', 'full');

// SVG stops take fractions where the glows give percent.
const percent = 100;

type CSSValue = string | number | undefined;

interface GlowColours {
  colours: Record<Glow['colour'], CSSValue>;
  surface: CSSValue;
}

function useBackdropColours(): GlowColours {
  const colours = useGlowColours();
  const surface = useCSSVariable('--color-content');

  return { colours, surface };
}

function GlowStopMark({
  stop,
  colour,
}: {
  stop: GlowStop;
  colour: CSSValue;
}): React.JSX.Element {
  return (
    <Stop
      offset={stop.at / percent}
      stopColor={String(colour)}
      stopOpacity={stop.alpha / percent}
    />
  );
}

type GlowCircle = { cx: number; cy: number; r: number };

function glowCircle(glow: Glow): GlowCircle {
  return {
    cx: glow.left + glow.size / 2,
    cy: glow.top + glow.size / 2,
    // CSS "circle farthest-corner" on a square: half its diagonal.
    r: (glow.size / 2) * Math.SQRT2,
  };
}

interface GlowPaint {
  glow: Glow;
  colour: CSSValue;
}

function GlowGradient({ glow, colour }: GlowPaint): React.JSX.Element {
  return (
    <RadialGradient
      id={`phone-glow-${glow.colour}`}
      gradientUnits="userSpaceOnUse"
      {...glowCircle(glow)}
    >
      {glow.stops.map((stop) => (
        <GlowStopMark key={stop.at} stop={stop} colour={colour} />
      ))}
    </RadialGradient>
  );
}

function EdgeFadeGradient({
  surface,
}: {
  surface: CSSValue;
}): React.JSX.Element {
  return (
    <LinearGradient id="phone-glow-edge" x1="0" y1="0" x2="1" y2="0">
      <Stop offset={0} stopColor={String(surface)} stopOpacity={0} />
      <Stop offset={1} stopColor={String(surface)} stopOpacity={1} />
    </LinearGradient>
  );
}

function GlowDefs(): React.JSX.Element {
  const { colours, surface } = useBackdropColours();

  return (
    <Defs>
      {glows.map((glow) => (
        <GlowGradient
          key={glow.colour}
          glow={glow}
          colour={colours[glow.colour]}
        />
      ))}
      <EdgeFadeGradient surface={surface} />
    </Defs>
  );
}

function GlowRect({ glow }: { glow: Glow }): React.JSX.Element {
  return (
    <Rect
      x={glow.left}
      y={glow.top}
      width={glow.size}
      height={glow.size}
      fill={`url(#phone-glow-${glow.colour})`}
    />
  );
}

interface BackdropWidth {
  width: number;
}

function EdgeFadeRect({ width }: BackdropWidth): React.JSX.Element {
  return (
    <Rect
      x={width - edgeFadeWidth}
      y={0}
      width={edgeFadeWidth}
      height="100%"
      fill="url(#phone-glow-edge)"
    />
  );
}

function BackdropSvg({ width }: BackdropWidth): React.JSX.Element {
  return (
    <Svg width={width} height="100%">
      <GlowDefs />
      {glows.map((glow) => (
        <GlowRect key={glow.colour} glow={glow} />
      ))}
      <EdgeFadeRect width={width} />
    </Svg>
  );
}

// Static, so the drawer's slide moves only the card above it and never repaints the glow.
export function PhoneDrawerBackdrop({
  width,
}: BackdropWidth): React.JSX.Element {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute bottom-0 left-0 top-0 overflow-hidden"
      style={{ width }}
    >
      <BackdropSvg width={width} />
    </View>
  );
}
