/*
 * Whether a perf report covers every scenario its run set out to measure.
 *
 * A report that omits a scenario which never ran is indistinguishable from a complete one, so a
 * PF number can be read as measured when nothing measured it. Every report therefore carries the
 * scenarios the run intended beside the ones it covered, and any gap between the two is loud.
 */

// One scenario of a run: an interaction at a CPU slowdown, named the way its test is named.
export interface PerfCase {
  interaction: string;
  cpu: number;
}

export const caseName = ({ interaction, cpu }: PerfCase): string =>
  `${interaction} at ${cpu}x CPU`;

export interface RunCompleteness {
  status: 'complete' | 'partial';
  planned: string[];
  measured: string[];
  notApplicable: string[];
  missing: string[];
}

export interface Covered {
  measured: readonly string[];
  // Scenarios the dataset or platform cannot exercise, each recorded with its own reason.
  notApplicable?: readonly string[];
}

export function runCompleteness(
  planned: readonly string[],
  { measured, notApplicable = [] }: Covered,
): RunCompleteness {
  const accounted = new Set([...measured, ...notApplicable]);
  const missing = planned.filter((scenario) => !accounted.has(scenario));

  return {
    status: missing.length ? 'partial' : 'complete',
    planned: [...planned],
    measured: [...measured],
    notApplicable: [...notApplicable],
    missing,
  };
}

const partialNotice = ({ planned, missing }: RunCompleteness): string =>
  [
    `INCOMPLETE RUN: ${missing.length} of ${planned.length} scenarios produced no measurement.`,
    `Never measured: ${missing.join(', ')}.`,
    'This report is partial. The missing scenarios have no result here, measured or otherwise.',
  ].join('\n');

// What the run prints about its own completeness, whichever way it went.
export const completenessNotice = (run: RunCompleteness): string =>
  run.status === 'complete'
    ? `Complete run: all ${run.planned.length} planned scenarios are accounted for.`
    : partialNotice(run);
