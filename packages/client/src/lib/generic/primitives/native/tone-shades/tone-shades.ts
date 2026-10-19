import { tones } from '@repo/contracts/kit-tokens';

const shadeStep = 100;

const shadeCount = 9;

export const toneShadeSteps = Array.from(
  { length: shadeCount },
  (_, index) => (index + 1) * shadeStep,
);

export type ToneShades = Partial<Record<(typeof tones)[number], string[]>>;

export const toneShadeTokens = tones.flatMap((tone) =>
  toneShadeSteps.map((step) => `--color-tone-${tone}-${step}`),
);

export function resolvedToneShades(
  values: (string | number | undefined)[],
): ToneShades {
  return Object.fromEntries(
    tones.map((tone, index) => [
      tone,
      values
        .slice(
          index * toneShadeSteps.length,
          (index + 1) * toneShadeSteps.length,
        )
        .map((value) => (typeof value === 'string' ? value : '')),
    ]),
  );
}
