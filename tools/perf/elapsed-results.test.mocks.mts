import type { BenchmarkMetadata, ElapsedResult } from './elapsed-results.mts';

export const metadata = {
  commit: 'tested-commit',
  track: 'controlled-rendering',
  build: {
    kind: 'production-web-export',
    sha256: 'served-export',
    files: 2,
    bytes: 100,
  },
  dataset: {
    sessions: 241,
    feedRows: 686,
    content: 'recorded text and Tool calls',
    attachments: 'excluded',
  },
  requestedSamples: 2,
  requestedWarmups: 1,
} satisfies BenchmarkMetadata;

export const measured: ElapsedResult = {
  interaction: 'composer-type-ready',
  cpu: 1,
  condition: 'warm',
  boundary: 'keydown to complete text',
  warmups: [{ driver: { status: 'completed', elapsedMs: 1 } }],
  samples: [
    {
      driver: { status: 'completed', elapsedMs: 100 },
      browser: {
        inputAtMs: 1000,
        firstReadyAtMs: 1007,
        settledAtMs: 1020,
        firstReadyMs: 7,
        settledMs: 20,
      },
    },
    {
      driver: {
        status: 'timed-out',
        phase: 'ready',
        elapsedMs: 500,
        error: 'Text not drawn',
      },
    },
  ],
};
