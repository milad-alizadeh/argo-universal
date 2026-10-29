import { runtimeError } from './runtime-error.mts';
import { runtimeMetadata, runtimeTarget } from './runtime-metadata.mts';
import {
  runtimeOptions,
  type RuntimeOptions,
  type RuntimeCase,
} from './runtime-options.mts';
import {
  writeRuntimeReport,
  type RuntimeReport,
  type RuntimeSample,
} from './runtime-report.mts';
import { observeRuntimeTurn } from './runtime-trial.mts';
import type { RuntimeTarget } from './runtime-types.mts';
import { runtimeWorkload } from './runtime-workloads.mts';

interface Runner {
  target: RuntimeTarget;
  options: RuntimeOptions;
  report: RuntimeReport;
}

async function sample(
  runner: Runner,
  kind: RuntimeCase,
  destination: RuntimeSample[],
): Promise<void> {
  const trial = await observeRuntimeTurn(
    runner.target,
    runtimeWorkload(kind, runner.options),
  );

  destination.push({ case: kind, trial });
  await writeRuntimeReport(runner.options.output, runner.report);
  console.log(`${kind} ${trial.id}: ${trial.status}`);
}

async function trials(
  runner: Runner,
  count: number,
  destination: RuntimeSample[],
): Promise<void> {
  for (let index = 0; index < count; index++)
    for (const kind of runner.options.cases)
      await sample(runner, kind, destination);
}

async function createRunner(options: RuntimeOptions): Promise<Runner> {
  const target = await runtimeTarget(options);
  const metadata = await runtimeMetadata(target, options);

  const report = createReport(metadata, options);

  return { target, options, report };
}

async function main(): Promise<void> {
  const options = runtimeOptions(process.argv.slice(2));

  if (!options) return;
  const runner = await createRunner(options);
  await writeRuntimeReport(options.output, runner.report);
  await trials(runner, options.warmups, runner.report.warmups);
  await trials(runner, options.runs, runner.report.samples);
  process.exitCode = runner.report.samples.some(
    (value) => value.trial.status !== 'completed',
  )
    ? 1
    : 0;
  console.log(`Saved runtime timing report: ${options.output}`);
}

void main().catch((cause) => {
  console.error(runtimeError(cause).message);
  process.exitCode = 1;
});

function createReport(
  metadata: RuntimeReport['metadata'],
  options: RuntimeOptions,
): RuntimeReport {
  return {
    metadata,
    clock: clockMetadata(),
    requested: { runs: options.runs, warmups: options.warmups },
    warmups: [],
    samples: [],
  };
}

function clockMetadata(): RuntimeReport['clock'] {
  return {
    source: 'Node performance.now',
    timeOriginUnixMs: performance.timeOrigin,
    startedAt: new Date().toISOString(),
  };
}
