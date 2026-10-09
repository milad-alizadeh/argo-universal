import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { auditReport } from './paper-drift/audit-report.mts';
import { auditSummary, runAudit } from './paper-drift/audit.mts';
import type { Scope } from './paper-drift/master-kind.mts';
import { masterLevels, nestedPairs } from './paper-drift/master-levels.mts';
import { connectPaper, type PaperPort } from './paper-drift/paper-port.mts';
import { readTokens } from './paper-drift/paper-tools.mts';
import { finishWorking, renameNodes } from './paper-drift/paper-writes.mts';
import { bootstrapRegistry } from './paper-drift/registry-bootstrap.mts';
import { formatRegistry, readRegistry } from './paper-drift/registry.mts';
import {
  planRename,
  readRenameMap,
  type RenamePlan,
} from './paper-drift/rename-plan.mts';
import type { Snapshot } from './paper-drift/snapshot-model.mts';
import { takeSnapshot } from './paper-drift/snapshot.mts';
import { applySync } from './paper-drift/sync-apply.mts';
import type { SyncPlans } from './paper-drift/sync-model.mts';
import { planSync } from './paper-drift/sync-plan.mts';
import { syncReport } from './paper-drift/sync-report.mts';
import { readCodeTokens } from './paper-drift/theme-tokens.mts';
import { planTokens, type TokenPlan } from './paper-drift/token-plan.mts';
import { applyTokens, tokenReport } from './paper-drift/token-sync.mts';
import {
  auditDataPath,
  auditReportPath,
  levelsPath,
  proposedRegistryPath,
  readSnapshot,
  registryPath,
  snapshotPath,
  syncShotsFolder,
  themePath,
  writeLocal,
} from './paper-drift/workspace.mts';

// The Argo design file in Paper.
const fileId = '01M44G6AG3HPXGPPPMKS9S3H8J';
const usage =
  'Usage: node tools/paper-drift.mts snapshot | registry | audit | levels | sync "<master>"... [--apply | --offline] | rename <map.json> [--apply | --offline] | tokens [--apply | --offline]';

function report(message: string): void {
  console.error(message);
}

async function withPaper(
  work: (paper: PaperPort) => Promise<void>,
): Promise<void> {
  const paper = await connectPaper(fileId);
  try {
    await work(paper);
  } finally {
    await paper.close();
  }
}

async function freshSnapshot(paper: PaperPort): Promise<Snapshot> {
  const taken = await takeSnapshot({ paper, fileId, report });
  writeLocal(snapshotPath, JSON.stringify(taken));
  console.log(
    `Snapshot: ${Object.keys(taken.layers).length} layers on ${taken.artboards.length} artboards → ${snapshotPath}`,
  );
  return taken;
}

async function snapshot(): Promise<void> {
  await withPaper(async (paper): Promise<void> => {
    await freshSnapshot(paper);
  });
}

// Ignored boards and demos carry over from the committed registry into a proposal.
function committedScope(): Scope {
  if (!existsSync(registryPath)) return {};
  const { ignoredArtboards, notComponents } = readRegistry(registryPath);
  return { ignoredArtboards, notComponents };
}

// Writes the registry only when there is none; otherwise a proposal to compare with it.
function registry(): Promise<void> {
  const { registry: proposed, skipped } = bootstrapRegistry(
    readSnapshot(),
    committedScope(),
  );
  const target = existsSync(registryPath) ? proposedRegistryPath : registryPath;
  writeLocal(target, formatRegistry(proposed));
  for (const name of skipped)
    console.log(`Skipped "${name.name}": ${name.reason}`);
  console.log(`Registry: ${proposed.masters.length} masters → ${target}`);
  return Promise.resolve();
}

// Reads the last snapshot only; Paper is not touched.
function audit(): Promise<void> {
  const taken = readSnapshot();
  const found = runAudit(
    taken,
    readRegistry(registryPath),
    readCodeTokens(themePath),
  );
  writeLocal(auditDataPath, JSON.stringify(found, null, 2));
  writeLocal(auditReportPath, auditReport(taken, found));
  for (const line of auditSummary(found)) console.log(line);
  console.log(`Report → ${auditReportPath}`);
  return Promise.resolve();
}

async function applyPlans(
  paper: PaperPort,
  plans: Parameters<typeof applySync>[1],
): Promise<void> {
  const folder = join(
    syncShotsFolder,
    new Date().toISOString().replaceAll(':', '-'),
  );
  const save = (name: string, image: Uint8Array): void =>
    writeLocal(join(folder, name), image);
  await applySync({ paper, save, report }, plans);
  console.log(`Before and after screenshots → ${folder}`);
}

function planAll(taken: Snapshot, names: string[]): SyncPlans {
  const masters = readRegistry(registryPath);
  const nested = nestedPairs(taken, masters, names);
  if (nested.length > 0)
    throw new Error(
      `Sync these in separate runs, inner first (pnpm -F @repo/tools paper:levels): ${nested.join('; ')}`,
    );
  const found = names.map((name): SyncPlans => {
    const plans = planSync(taken, masters, name);
    for (const line of syncReport(name, plans)) console.log(line);
    return plans;
  });
  return {
    plans: found.flatMap((part): SyncPlans['plans'] => part.plans),
    blocked: found.flatMap((part): SyncPlans['blocked'] => part.blocked),
  };
}

// Plans against a fresh snapshot, so the plan matches the file; changes Paper only with --apply.
async function syncMasters(
  paper: PaperPort,
  names: string[],
  apply: boolean,
): Promise<void> {
  const found = planAll(await freshSnapshot(paper), names);
  if (apply) await applyPlans(paper, found.plans);
  else
    console.log('Dry run: nothing changed. Add --apply to sync these copies.');
}

// Several names share one snapshot, so they must not nest: take them from one paper:levels level.
async function sync(args: string[]): Promise<void> {
  const names = args.filter((arg): boolean => !arg.startsWith('--'));
  if (names.length === 0) throw new Error(usage);
  if (args.includes('--offline')) {
    planAll(readSnapshot(), names);
    return;
  }
  await withPaper((paper): Promise<void> =>
    syncMasters(paper, names, args.includes('--apply')),
  );
}

// Reads the last snapshot only: the order to sync masters in, innermost first.
function levels(): Promise<void> {
  const found = masterLevels(readSnapshot(), readRegistry(registryPath));
  writeLocal(levelsPath, JSON.stringify(found, null, 2));
  for (const level of found)
    console.log(`Level ${level.depth}: ${level.names.length} masters`);
  console.log(`Levels → ${levelsPath}`);
  return Promise.resolve();
}

function renameReport(plan: RenamePlan): void {
  const masters = plan.registry.masters.length;
  console.log(
    `Rename: ${plan.updates.length} layers; registry keeps ${masters} masters.`,
  );
  for (const problem of plan.problems) console.log(`Problem: ${problem}`);
}

async function applyRename(paper: PaperPort, plan: RenamePlan): Promise<void> {
  if (plan.problems.length > 0)
    throw new Error('Fix the rename map problems before --apply.');
  await renameNodes(paper, plan.updates);
  await finishWorking(paper);
  writeLocal(registryPath, formatRegistry(plan.registry));
  console.log(`Renamed ${plan.updates.length} layers and ${registryPath}.`);
}

// pnpm runs the script in tools/, so a path argument is read from where pnpm was called.
function callerPath(argument: string): string {
  return resolve(process.env.INIT_CWD ?? '', argument);
}

// Renames masters, their copies and the registry together; changes Paper only with --apply.
async function rename(args: string[]): Promise<void> {
  const mapPath = args.find((arg): boolean => !arg.startsWith('--'));
  if (mapPath === undefined) throw new Error(usage);
  const map = readRenameMap(callerPath(mapPath));
  const masters = readRegistry(registryPath);
  if (args.includes('--offline')) {
    renameReport(planRename(readSnapshot(), masters, map));
    return;
  }
  await withPaper(async (paper): Promise<void> => {
    const plan = planRename(await freshSnapshot(paper), masters, map);
    renameReport(plan);
    if (args.includes('--apply')) await applyRename(paper, plan);
    else console.log('Dry run: nothing changed. Add --apply to rename.');
  });
}

function planCodeTokens(paperTokens: Record<string, string>): TokenPlan {
  const plan = planTokens(paperTokens, readCodeTokens(themePath));
  for (const line of tokenReport(plan)) console.log(line);
  return plan;
}

async function writeTokens(paper: PaperPort, plan: TokenPlan): Promise<void> {
  const refused = await applyTokens(paper, plan);
  for (const line of refused) console.log(`Paper refused ${line}`);
  const written = plan.add.length + plan.change.length - refused.length;
  console.log(`Wrote ${written} tokens; Paper refused ${refused.length}.`);
  if (refused.length > 0) process.exitCode = 1;
}

// Writes theme.css's tokens into Paper; changes Paper only with --apply, never deletes.
async function tokens(args: string[]): Promise<void> {
  if (args.includes('--offline')) {
    planCodeTokens(readSnapshot().tokens);
    return;
  }
  await withPaper(async (paper): Promise<void> => {
    const plan = planCodeTokens(await readTokens(paper));
    if (args.includes('--apply')) await writeTokens(paper, plan);
    else console.log('Dry run: nothing changed. Add --apply to write tokens.');
  });
}

const commands: Record<string, (args: string[]) => Promise<void>> = {
  snapshot,
  registry,
  audit,
  sync,
  rename,
  levels,
  tokens,
};

async function run([command, ...args]: string[]): Promise<void> {
  const handler = command === undefined ? undefined : commands[command];
  if (!handler) throw new Error(usage);
  await handler(args);
}

try {
  await run(process.argv.slice(2));
} catch (error) {
  console.error('paper-drift:', error);
  process.exitCode = 1;
}
