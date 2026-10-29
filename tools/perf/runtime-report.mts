import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { runtimeMetadata } from './runtime-metadata.mts';
import type { RuntimeCase } from './runtime-options.mts';
import { runtimeSummary } from './runtime-summary.mts';
import type { RuntimeTrial } from './runtime-types.mts';

export interface RuntimeSample {
  case: RuntimeCase;
  trial: RuntimeTrial;
}

export interface RuntimeReport {
  metadata: Awaited<ReturnType<typeof runtimeMetadata>>;
  clock: {
    source: 'Node performance.now';
    timeOriginUnixMs: number;
    startedAt: string;
  };
  requested: { runs: number; warmups: number };
  warmups: RuntimeSample[];
  samples: RuntimeSample[];
}

// Save after every trial, including a failure or timeout; warmups never enter the measured summaries.
export async function writeRuntimeReport(
  file: string,
  report: RuntimeReport,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      { ...report, summary: runtimeSummary(report.samples) },
      null,
      2,
    ),
  );
}
