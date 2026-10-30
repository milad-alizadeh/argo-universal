import {
  completenessNotice,
  type RunCompleteness,
} from './run-completeness.mts';
import { runtimeError } from './runtime-error.mts';
import { runtimeMetadata, runtimeTarget } from './runtime-metadata.mts';
import {
  runtimeOptions,
  type RuntimeOptions,
  type RuntimeCase,
} from './runtime-options.mts';
import {
  runtimeCompleteness,
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

const incomplete = (report: RuntimeReport, run: RunCompleteness): boolean =>
  run.status === 'partial' ||
  report.samples.some((value) => value.trial.status !== 'completed');

const requested = (options: RuntimeOptions): RuntimeReport['requested'] => ({
  runs: options.runs,
  warmups: options.warmups,
  cases: options.cases,
});

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

  const run = runtimeCompleteness(
    runner.report.requested,
    runner.report.samples.map((sample) => sample.case),
  );

  console.log(completenessNotice(run));
  process.exitCode = incomplete(runner.report, run) ? 1 : 0;
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
    requested: requested(options),
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
