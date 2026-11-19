import { useCSSVariable } from 'uniwind';

// The two colours ElevenLabs' shader ramps between, as their Orb's `colors` prop takes them: any CSS colour each.
export type OrbColors = [string, string];

/*
 * Argo's own pair: the Accent tone's 300 and 400 shades, the neutral orb Paper's Voice page draws, lighter first as
 * ElevenLabs' default pair is. The tone flips with the theme, so a theme change repaints the orb.
 */
const accentShades = ['--color-tone-accent-300', '--color-tone-accent-400'];

// The colours the orb draws: the pair it was given, else the theme's, read again whenever the theme changes.
export function useOrbColors(given: OrbColors | undefined): OrbColors {
  const [lighter, darker] = useCSSVariable(accentShades);

  return given ?? [String(lighter), String(darker)];
}
