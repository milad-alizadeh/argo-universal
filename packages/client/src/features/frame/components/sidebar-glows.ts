// Paper's "SidebarBackdrop / Warm frost (contained)": three faint glows behind the glass, faded into the window surface at the right.
export type GlowColour = 'warm' | 'graphite' | 'sand';

// Both in percent: the glow colour's strength, and its place along the radius.
export interface GlowStop {
  alpha: number;
  at: number;
}

export interface Glow {
  colour: GlowColour;
  left: number;
  top: number;
  size: number;
  stops: readonly GlowStop[];
}

// The phone drawer draws the desktop glows at three quarters, placed for its taller panel.
export type GlowLayout = 'desktop' | 'phone';

// The collapsed desktop sidebar shows the same glows, fainter.
export type GlowStrength = 'full' | 'faint';

export interface SidebarGlows {
  glows: readonly Glow[];
  edgeFadeWidth: number;
}

interface GlowSource {
  colour: GlowColour;
  left: number;
  top: Readonly<Record<GlowLayout, number>>;
  size: number;
  stops: readonly {
    at: number;
    alpha: Readonly<Record<GlowStrength, number>>;
  }[];
}

const warmFrost: readonly GlowSource[] = [
  {
    colour: 'warm',
    left: -410,
    top: { desktop: -330, phone: -300 },
    size: 900,
    stops: [
      { at: 0, alpha: { full: 16, faint: 10 } },
      { at: 30, alpha: { full: 6, faint: 4 } },
      { at: 62, alpha: { full: 0, faint: 0 } },
    ],
  },
  {
    colour: 'graphite',
    left: -260,
    top: { desktop: 200, phone: 331 },
    size: 640,
    stops: [
      { at: 0, alpha: { full: 6, faint: 4 } },
      { at: 66, alpha: { full: 0, faint: 0 } },
    ],
  },
  {
    colour: 'sand',
    left: -230,
    top: { desktop: 510, phone: 725 },
    size: 700,
    stops: [
      { at: 0, alpha: { full: 12, faint: 8 } },
      { at: 64, alpha: { full: 0, faint: 0 } },
    ],
  },
];

const layoutScale: Readonly<Record<GlowLayout, number>> = {
  desktop: 1,
  phone: 0.75,
};

const desktopEdgeFadeWidth = 56;

function stopsAt(
  source: GlowSource,
  strength: GlowStrength,
): readonly GlowStop[] {
  return source.stops.map(({ at, alpha }) => ({ at, alpha: alpha[strength] }));
}

function scaledGlow(
  source: GlowSource,
  { layout, strength }: { layout: GlowLayout; strength: GlowStrength },
): Glow {
  const scale = layoutScale[layout];
  return {
    colour: source.colour,
    left: Math.round(source.left * scale),
    top: Math.round(source.top[layout] * scale),
    size: Math.round(source.size * scale),
    stops: stopsAt(source, strength),
  };
}

export function sidebarGlows(
  layout: GlowLayout,
  strength: GlowStrength,
): SidebarGlows {
  return {
    edgeFadeWidth: Math.round(desktopEdgeFadeWidth * layoutScale[layout]),
    glows: warmFrost.map((source) => scaledGlow(source, { layout, strength })),
  };
}
