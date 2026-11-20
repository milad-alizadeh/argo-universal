import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { answer, archiveProject } from './operation-eval-operations.mts';
import {
  evalHelp,
  evalTarget,
  readEvalOptions,
  type EvalOptions,
} from './operation-eval-options.mts';
import { report, type EvalRecord } from './operation-eval-report.mts';
import { runEvalTask } from './operation-eval-session.mts';
import { evalTasks, type EvalTask } from './operation-eval-tasks.mts';
import { runtimeClient, type RuntimeClient } from './runtime-client.mts';

type Evaluation = {
  client: RuntimeClient;
  chosen: EvalOptions;
  projectId: string;
  tasks: readonly EvalTask[];
  records: EvalRecord[];
  recordsFile: string;
};

type EvalSlot = { agent: string; run: number; task: EvalTask };

const created = z.object({ projectId: z.string() });

const projectFor = async (
  client: RuntimeClient,
  chosen: EvalOptions,
): Promise<string> =>
  chosen.project ??
  (
    await answer(
      client,
      { id: 'project.create', params: { name: chosen.projectName } },
      created,
    )
  ).projectId;

const milliseconds = (value: number | null): string =>
  value === null ? '–' : String(Math.round(value));

const shown = (record: EvalRecord): string =>
  `${record.agent} ${record.task} #${record.run}: ${record.outcome}, ` +
  `${milliseconds(record.msToOperation)} ms to Operation, ${record.agentCallsBefore} Agent calls, ` +
  `${record.searchesBefore} searches, ${record.toolLoadsBefore} tool loads`;

function keep(evaluation: Evaluation, record: EvalRecord): void {
  evaluation.records.push(record);
  appendFileSync(evaluation.recordsFile, `${JSON.stringify(record)}\n`);
  console.log(shown(record));
}

// One run of one task; a run that fails is reported and left out, so the others still count.
async function runOnce(
  evaluation: Evaluation,
  { agent, run, task }: EvalSlot,
): Promise<void> {
  const { client, projectId, chosen } = evaluation;

  const timeoutMs = chosen.timeoutMs;

  await runEvalTask({ client, projectId, agent, task, timeoutMs }).then(
    (measured) => keep(evaluation, { ...measured, agent, task: task.id, run }),
    (error: Error) =>
      console.error(`${agent} ${task.id} #${run} failed: ${error.message}`),
  );
}

// One Agent's runs, one after another, so its timings do not compete with each other.
async function runAgent(evaluation: Evaluation, agent: string): Promise<void> {
  for (let run = 1; run <= evaluation.chosen.runs; run += 1)
    for (const task of evaluation.tasks)
      await runOnce(evaluation, { agent, run, task });
}

async function finish(evaluation: Evaluation): Promise<void> {
  const table = report(evaluation.records);

  writeFileSync(path.join(evaluation.chosen.output, 'report.md'), `${table}\n`);
  console.log(`\n${table}`);

  if (evaluation.chosen.keep) return;

  const archived = await archiveProject(
    evaluation.client,
    evaluation.projectId,
  );

  console.log(`Archived ${archived} Sessions.`);
}

async function prepare(
  client: RuntimeClient,
  chosen: EvalOptions,
): Promise<Evaluation> {
  mkdirSync(chosen.output, { recursive: true });

  return {
    client,
    chosen,
    projectId: await projectFor(client, chosen),
    tasks: evalTasks.filter(({ id }) => chosen.tasks.includes(id)),
    records: [],
    recordsFile: path.join(chosen.output, 'runs.jsonl'),
  };
}

async function evaluate(
  client: RuntimeClient,
  chosen: EvalOptions,
): Promise<void> {
  const evaluation = await prepare(client, chosen);

  console.log(
    `Project ${evaluation.projectId}; runs in ${evaluation.recordsFile}`,
  );
  await Promise.all(chosen.agents.map((agent) => runAgent(evaluation, agent)));
  await finish(evaluation);
}

async function main(): Promise<void> {
  const chosen = readEvalOptions();

  if (!chosen) return console.log(evalHelp);

  const connection = runtimeClient(
    await evalTarget(chosen.home),
    new AbortController().signal,
  );

  try {
    await evaluate(connection.client, chosen);
  } finally {
    connection.close();
  }
}

await main();
