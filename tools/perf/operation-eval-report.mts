import type { RunMeasure } from './operation-eval-measure.mts';

// One run of one task on one Agent, as the eval records it.
export type EvalRecord = RunMeasure & {
  agent: string;
  task: string;
  run: number;
  sessionId: string;
};

const percentile = (
  values: readonly number[],
  share: number,
): number | null => {
  const sorted = values.toSorted((a, b) => a - b);

  return sorted.length === 0
    ? null
    : (sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ??
        null);
};

const seconds = (ms: number | null): string =>
  ms === null ? '–' : (ms / 1000).toFixed(1);

const mean = (values: readonly number[]): string =>
  values.length === 0
    ? '–'
    : (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
        1,
      );

const present = (values: readonly (number | null)[]): number[] =>
  values.filter((value) => value !== null);

const average = <
  Field extends 'agentCallsBefore' | 'searchesBefore' | 'toolLoadsBefore',
>(
  records: readonly EvalRecord[],
  field: Field,
): string => mean(records.map((record) => record[field]));

// How fast the Agent reached the Operation in the runs where it did: median and 90th percentile.
function timing(found: readonly EvalRecord[]): string[] {
  const toOperation = present(found.map(({ msToOperation }) => msToOperation));

  return [
    seconds(percentile(toOperation, 0.5)),
    seconds(percentile(toOperation, 0.9)),
  ];
}

const counts = [
  'agentCallsBefore',
  'searchesBefore',
  'toolLoadsBefore',
] as const;

// The measured columns of one row: runs that reached the Operation, its timing, the calls before it, and the Turn.
function measured(records: readonly EvalRecord[]): string[] {
  const found = records.filter(({ outcome }) => outcome === 'found');

  const turns = present(records.map(({ turnMs }) => turnMs));

  return [
    `${found.length}/${records.length}`,
    ...timing(found),
    ...counts.map((field) => average(found, field)),
    seconds(percentile(turns, 0.5)),
  ];
}

const row = (
  agent: string,
  task: string,
  records: readonly EvalRecord[],
): string => [agent, task, ...measured(records)].join(' | ');

const header = [
  'Agent | Task | Ran it | To Operation p50 (s) | p90 (s) | Agent calls | Searches | Tool loads | Turn p50 (s)',
  '--- | --- | --- | --- | --- | --- | --- | --- | ---',
];

const distinct = (values: readonly string[]): string[] => [...new Set(values)];

// One Agent's rows: each task, then all its tasks together.
function agentRows(records: readonly EvalRecord[], agent: string): string[] {
  const own = records.filter((record) => record.agent === agent);

  return [
    ...distinct(own.map(({ task }) => task)).map((task) =>
      row(
        agent,
        task,
        own.filter((record) => record.task === task),
      ),
    ),
    row(agent, '**all**', own),
  ];
}

// A Markdown table with one row per Agent and task, then one per Agent over all tasks.
export function report(records: readonly EvalRecord[]): string {
  const rows = distinct(records.map(({ agent }) => agent)).flatMap((agent) =>
    agentRows(records, agent),
  );

  return [...header, ...rows.map((line) => `| ${line} |`)].join('\n');
}
