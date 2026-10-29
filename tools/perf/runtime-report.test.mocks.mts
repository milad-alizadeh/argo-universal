import assert from 'node:assert/strict';
import { runtimeMetadata } from './runtime-metadata.mts';
import { runtimeOptions } from './runtime-options.mts';
import { writeRuntimeReport, type RuntimeReport } from './runtime-report.mts';
import type { runtimeTestHost } from './runtime-test-host.test.mocks.mts';
import type { RuntimeTrial } from './runtime-types.mts';

export async function persistFixtureTrial(
  host: Awaited<ReturnType<typeof runtimeTestHost>>,
  trial: RuntimeTrial,
): Promise<void> {
  const options = runtimeOptions([
    '--real-agent',
    '--home',
    host.home,
    '--session',
    host.target.sessionId,
  ]);

  assert(options);
  const metadata = await runtimeMetadata(host.target, options);

  const report: RuntimeReport = {
    metadata,
    clock: {
      source: 'Node performance.now',
      timeOriginUnixMs: performance.timeOrigin,
      startedAt: new Date().toISOString(),
    },
    requested: { runs: 1, warmups: 0 },
    warmups: [],
    samples: [{ case: 'command', trial }],
  };

  await writeRuntimeReport(host.reportPath, report);
}
