import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Soak } from './soak-state.mts';

const notes = [
  'Samples are raw. Raw memory growth alone does not prove a leak.',
  'App metrics are Chromium Performance.getMetrics; Server metrics are the listening process and its descendants from ps.',
  'Server reads and subscriptions are not observed.',
  'The probe is a driver-clock Session open from a reloaded App, repeated at the same interval.',
  'cancellationsObserved counts only cancellations whose Stop button appeared; a Turn that finished first is not one.',
];

const reportFile = async (): Promise<string> => {
  const directory = process.env.PERF_OUT ?? path.join(os.tmpdir(), 'argo-perf');

  await mkdir(directory, { recursive: true });

  return path.join(
    directory,
    `${process.env.PERF_LABEL ?? 'current'}-soak.json`,
  );
};

interface SeededCounts {
  sessions: number;
  feedRows: number;
}

const seeded = ({ server }: Soak): SeededCounts => ({
  sessions: server.sessionCount,
  feedRows: server.feedRowCount,
});

const reportData = (soak: Soak): string =>
  JSON.stringify(
    {
      date: new Date().toISOString(),
      track: 'controlled-rendering, scripted Agent',
      requestedMinutes: soak.minutes,
      activity: soak.activity,
      seeded: seeded(soak),
      notes,
      probes: soak.probes,
      samples: soak.samples,
    },
    null,
    2,
  );

export async function writeReport(soak: Soak): Promise<void> {
  const file = await reportFile();

  await writeFile(file, reportData(soak));
  console.log(`Soak results: ${file}. Raw samples; no verdict.`);
}
