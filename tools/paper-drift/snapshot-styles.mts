import { setTimeout } from 'node:timers/promises';
import type { PaperPort } from './paper-port.mts';
import { readComputedStyles, readJsx } from './paper-tools.mts';
import type { Layer, Snapshot, Styles } from './snapshot-model.mts';
import {
  planStyleRead,
  reuseRefusal,
  splitStyleUnits,
  unitFingerprint,
  type StylePlan,
  type StyleUnit,
} from './style-reuse.mts';

// Small batches with a pause between them: whole-file style reads have made Paper Desktop quit.
const STYLE_BATCH = 100;
const STYLE_PAUSE_MS = 200;
const STYLE_REPORT_EVERY = 1000;
const FINGERPRINT_REPORT_EVERY = 50;

export interface StyleRun {
  paper: PaperPort;
  fileId: string;
  report: (message: string) => void;
}

export type SnapshotStyles = Pick<Snapshot, 'styles' | 'fingerprints'>;

function reportProgress(
  report: StyleRun['report'],
  { done, total }: { done: number; total: number },
): void {
  if (done % STYLE_REPORT_EVERY === 0 || done === total)
    report(`Styles: ${done}/${total} layers`);
}

async function readStyles(
  { paper, report }: StyleRun,
  ids: string[],
): Promise<Record<string, Styles>> {
  const styles: Record<string, Styles> = {};
  for (let start = 0; start < ids.length; start += STYLE_BATCH) {
    const batch = ids.slice(start, start + STYLE_BATCH);
    Object.assign(styles, await readComputedStyles(paper, batch));
    reportProgress(report, { done: start + batch.length, total: ids.length });
    await setTimeout(STYLE_PAUSE_MS);
  }
  return styles;
}

function layersOf(layers: Record<string, Layer>, unit: StyleUnit): Layer[] {
  return unit.layers.flatMap((id): Layer[] => {
    const layer = layers[id];
    return layer ? [layer] : [];
  });
}

async function fingerprintUnits(
  { paper, report }: StyleRun,
  { layers, units }: { layers: Record<string, Layer>; units: StyleUnit[] },
): Promise<Record<string, string>> {
  const fingerprints: Record<string, string> = {};
  for (const [done, unit] of units.entries()) {
    const jsx = await readJsx(paper, unit.root);
    fingerprints[unit.root] = unitFingerprint(jsx, layersOf(layers, unit));
    if ((done + 1) % FINGERPRINT_REPORT_EVERY === 0)
      report(`Fingerprints: ${done + 1}/${units.length} units`);
  }
  return fingerprints;
}

function reusablePrevious(
  run: StyleRun,
  tokens: Record<string, string>,
  previous: Snapshot | undefined,
): Snapshot | undefined {
  const refusal = reuseRefusal(previous, { fileId: run.fileId, tokens });
  if (refusal) run.report(`Reading every layer's styles: ${refusal}.`);
  return refusal ? undefined : previous;
}

function planSummary(plan: StylePlan): string {
  return `Units: ${plan.reusedUnits} reused, ${plan.rereadUnits} re-read; reading styles of ${plan.read.length} layers`;
}

// Reads the styles of the units that changed since the previous snapshot and reuses the rest; no previous snapshot reads every layer.
export async function readSnapshotStyles(
  run: StyleRun,
  { layers, tokens }: Pick<Snapshot, 'layers' | 'tokens'>,
  previous: Snapshot | undefined,
): Promise<SnapshotStyles> {
  const split = splitStyleUnits(layers);
  const units = split.units;
  const fingerprints = await fingerprintUnits(run, { layers, units });
  const reusable = reusablePrevious(run, tokens, previous);
  const plan = planStyleRead({ split, fingerprints, previous: reusable });
  run.report(planSummary(plan));
  const read = await readStyles(run, plan.read);
  return { styles: { ...plan.reused, ...read }, fingerprints };
}
