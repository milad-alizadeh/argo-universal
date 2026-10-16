import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const allowedModes = new Set([
  'web',
  'electron',
  'electron-no-gpu',
  'desktop',
  'desktop-no-gpu',
]);

const stressCounts = { small: 5000, large: 20000 };

export const timing = {
  pan: 6000,
  deadline: 10000,
  ready: 25000,
  settle: 1000,
  fit: 200,
};

function directory() {
  const requested = process.env.CODEMAP_EVIDENCE;

  if (!requested) return mkdtempSync(join(tmpdir(), 'codemap-834-evidence-'));
  mkdirSync(requested, { recursive: true });

  return requested;
}

function views(requested) {
  if (['3d', 'flat'].includes(requested)) return [requested];

  return ['3d', 'flat'];
}

function sampling() {
  const standardSamples = 3;

  return {
    counts: process.env.CODEMAP_SMOKE ? [0] : Object.values(stressCounts),
    samples: process.env.CODEMAP_SMOKE ? 1 : standardSamples,
  };
}

function mode() {
  const value = process.argv[2] ?? 'web';

  if (!allowedModes.has(value))
    throw new Error(`Unsupported measurement mode: ${value}`);

  return value;
}

export function options() {
  const selectedMode = mode();

  return {
    mode: selectedMode,
    directory: directory(),
    fullDesktop: selectedMode.startsWith('desktop'),
    views: views(process.argv[3]),
    ...sampling(),
  };
}

export function scenarios(settings) {
  return settings.views.flatMap((view) =>
    settings.counts.map((count) => ({
      view,
      count,
      query: `?view=${view}&files=${count}`,
    })),
  );
}
