import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CDPSession } from '@playwright/test';
import { z } from 'zod';

const execute = promisify(execFile);

export interface ProcessTree {
  // The Server process that listens on the port, and every process below it (Agents, their commands).
  processes: number;
  rssKb: number;
  cpuPercent: number;
}

export interface AppMetrics {
  jsHeapUsedBytes: number;
  domNodes: number;
  eventListeners: number;
  documents: number;
}

export interface SoakSample {
  elapsedMs: number;
  cycle: number;
  app: AppMetrics;
  server: ProcessTree | null;
}

interface Metric {
  name: string;
  value: number;
}

const valueOf = (metrics: Metric[], name: string): number =>
  metrics.find((metric) => metric.name === name)?.value ?? 0;

export async function appMetrics(cdp: CDPSession): Promise<AppMetrics> {
  const { metrics } = await cdp.send('Performance.getMetrics');

  return {
    jsHeapUsedBytes: valueOf(metrics, 'JSHeapUsedSize'),
    domNodes: valueOf(metrics, 'Nodes'),
    eventListeners: valueOf(metrics, 'JSEventListeners'),
    documents: valueOf(metrics, 'Documents'),
  };
}

async function listeningPid(port: number): Promise<number> {
  const { stdout } = await execute('lsof', [
    '-nP',
    `-iTCP:${port}`,
    '-sTCP:LISTEN',
    '-t',
  ]);

  return Number.parseInt(stdout, 10);
}

// The process that listens on `port`; the only process this reads is the one this run started.
async function listener(port: number): Promise<number | null> {
  const pid = await listeningPid(port).catch(() => 0);

  return pid > 0 ? pid : null;
}

const number = z.coerce.number();

const processRow = z
  .tuple([number, number, number, number])
  .transform(([pid, ppid, rssKb, cpu]) => ({ pid, ppid, rssKb, cpu }));

type Row = z.output<typeof processRow>;

async function processTable(): Promise<Row[]> {
  const { stdout } = await execute('ps', ['-A', '-o', 'pid=,ppid=,rss=,pcpu=']);

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => processRow.parse(line.trim().split(/\s+/u)));
}

const below = (table: Row[], root: number): Row[] => [
  ...table.filter(({ pid }) => pid === root),
  ...table
    .filter(({ ppid }) => ppid === root)
    .flatMap(({ pid }) => below(table, pid)),
];

const sum = (rows: Row[], column: 'rssKb' | 'cpu'): number =>
  rows.reduce((total, row) => total + row[column], 0);

// Reads the Server's process tree from `ps`; null when no process listens on the port.
export async function serverTree(port: number): Promise<ProcessTree | null> {
  const root = await listener(port);

  if (root === null) return null;
  const tree = below(await processTable(), root);

  return {
    processes: tree.length,
    rssKb: sum(tree, 'rssKb'),
    cpuPercent: sum(tree, 'cpu'),
  };
}
