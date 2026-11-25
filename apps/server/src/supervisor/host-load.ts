import { availableParallelism, freemem, loadavg, totalmem } from 'node:os';
import { readProcessTable } from '@repo/process/process-table';

const checkCommand =
  /(?:^|[ /])(?:verify\.mts|vitest|vitest-pool|tsc|tsgo|esbuild|storybook|playwright|chrome-headless-shell|simctl)(?=$|[ ./])/;

// A shell can repeat this entire command in its arguments. Count the Node process only.
const verifyCommand = /^(?:\S*\/)?node (?:\S*\/)?tools\/verify\.mts(?:$| )/;

const agentCommand =
  /(?:^|[ /])(?:codex(?:-acp)?|claude(?:-acp)?|gemini(?:-cli)?|opencode|argo-pi|agent-shell)(?=$|[ /])/;

const argoCommand =
  /(?:Argo\.app\/Contents\/|node_modules\/.*\/Electron\.app\/Contents\/|(?:^|[ /])(?:engine-entry|plugin-host-entry|engine\/main|host\/process)\.[cm]?[jt]s(?:$| ))/;

type Group = 'argo' | 'agents' | 'checks' | 'other';

type ProcessRow = {
  parent: number;
  cpuPercent: number;
  rssKiB: number;
  command: string;
};

type Totals = Omit<ProcessRow, 'parent' | 'command'> & { processes: number };

type Groups = Record<Group, Totals> & { verifyRuns: number };

type HostLoad = {
  loadAverage: number[];
  logicalCores: number;
  freeMemoryBytes: number;
  totalMemoryBytes: number;
  groups: Groups | null;
  engineProcessCpuPercent: number | null;
};

const totals = (): Totals => ({ cpuPercent: 0, rssKiB: 0, processes: 0 });

function inheritedGroup(
  row: ProcessRow,
  rows: ReadonlyMap<number, ProcessRow>,
  visited: Set<ProcessRow>,
): Group {
  if (visited.has(row)) return 'other';

  if (checkCommand.test(row.command)) return 'checks';

  visited.add(row);

  const parent = rows.get(row.parent);
  const ancestor = parent ? inheritedGroup(parent, rows, visited) : 'other';

  if (ancestor === 'checks') return ancestor;

  return agentCommand.test(row.command) ? 'agents' : ancestor;
}

function groupOf(
  row: ProcessRow,
  rows: ReadonlyMap<number, ProcessRow>,
): Group {
  const group = inheritedGroup(row, rows, new Set());

  if (group === 'checks') return group;

  return argoCommand.test(row.command) ? 'argo' : group;
}

function processRows(output: string): Map<number, ProcessRow> {
  const rows = new Map<number, ProcessRow>();

  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)/.exec(line);

    if (!match) continue;

    const [, pid, parent, cpu, rss, command = ''] = match;

    rows.set(Number(pid), {
      parent: Number(parent),
      cpuPercent: Number(cpu),
      rssKiB: Number(rss),
      command,
    });
  }

  return rows;
}

// The raw process table stays in memory. Command lines can contain credentials.
export function summarizeProcesses(
  output: string,
  supervisorPid: number,
): Groups {
  return summarizeRows(processRows(output), supervisorPid);
}

function summarizeRows(
  rows: ReadonlyMap<number, ProcessRow>,
  supervisorPid: number,
): Groups {
  const groups = {
    argo: totals(),
    agents: totals(),
    checks: totals(),
    other: totals(),
    verifyRuns: 0,
  };

  for (const [pid, row] of rows) {
    const group = groups[pid === supervisorPid ? 'argo' : groupOf(row, rows)];

    group.cpuPercent += row.cpuPercent;
    group.rssKiB += row.rssKiB;
    group.processes++;

    if (verifyCommand.test(row.command)) groups.verifyRuns++;
  }

  return groups;
}

type ProcessSample = Pick<HostLoad, 'groups' | 'engineProcessCpuPercent'>;

async function readGroups(
  supervisorPid: number,
  enginePid?: number,
): Promise<ProcessSample> {
  try {
    const rows = processRows(await readProcessTable());

    return {
      groups: summarizeRows(rows, supervisorPid),
      engineProcessCpuPercent: enginePid
        ? (rows.get(enginePid)?.cpuPercent ?? null)
        : null,
    };
  } catch {
    return { groups: null, engineProcessCpuPercent: null };
  }
}

export async function sampleHostLoad(
  supervisorPid: number,
  enginePid?: number,
): Promise<HostLoad> {
  return {
    loadAverage: loadavg(),
    logicalCores: availableParallelism(),
    freeMemoryBytes: freemem(),
    totalMemoryBytes: totalmem(),
    ...(await readGroups(supervisorPid, enginePid)),
  };
}
