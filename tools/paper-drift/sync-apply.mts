import { setTimeout as wait } from 'node:timers/promises';
import type { PaperPort } from './paper-port.mts';
import { readNodeInfo, readText } from './paper-tools.mts';
import {
  deleteNodes,
  duplicateInto,
  finishWorking,
  moveBefore,
  screenshot,
  setTexts,
  updateStyles,
} from './paper-writes.mts';
import type { SyncPlan } from './sync-model.mts';

// Carries out sync plans in Paper: clone the master beside the copy, put back what the copy owns, delete the copy.
export interface SyncRun {
  paper: PaperPort;
  save: (name: string, image: Uint8Array) => void;
  report: (message: string) => void;
}

type Ids = Record<string, string>;

function idIn(ids: Ids, masterId: string): string {
  const id = ids[masterId];
  if (id === undefined)
    throw new Error(`The clone has no copy of ${masterId}.`);
  return id;
}

async function readCopyTexts(
  paper: PaperPort,
  plan: SyncPlan,
): Promise<[string, string][]> {
  const texts: [string, string][] = [];
  for (const [masterId, copyId] of plan.texts)
    texts.push([masterId, await readText(paper, copyId)]);
  return texts;
}

function styleUpdates(
  plan: SyncPlan,
  ids: Ids,
): { nodeIds: string[]; styles: Record<string, string | number> }[] {
  return [
    { nodeIds: [idIn(ids, plan.masterId)], styles: plan.placement },
    ...plan.display.map(([masterId, display]) => ({
      nodeIds: [idIn(ids, masterId)],
      styles: { display },
    })),
  ].filter((update): boolean => Object.keys(update.styles).length > 0);
}

async function keepNested(
  paper: PaperPort,
  plan: SyncPlan,
  ids: Ids,
): Promise<void> {
  for (const [masterId, copyId] of plan.kept)
    await moveBefore(paper, copyId, idIn(ids, masterId));
  await deleteNodes(
    paper,
    plan.kept.map(([masterId]): string => idIn(ids, masterId)),
  );
}

async function restoreTexts(
  paper: PaperPort,
  plan: SyncPlan,
  ids: Ids,
): Promise<void> {
  const texts = await readCopyTexts(paper, plan);
  const updates = texts.map(([masterId, textContent]) => ({
    nodeId: idIn(ids, masterId),
    textContent,
  }));
  await setTexts(paper, updates);
}

async function restore(
  paper: PaperPort,
  plan: SyncPlan,
  ids: Ids,
): Promise<void> {
  await restoreTexts(paper, plan, ids);
  await updateStyles(paper, styleUpdates(plan, ids));
  await keepNested(paper, plan, ids);
}

async function applyOne(run: SyncRun, plan: SyncPlan): Promise<string> {
  const { paper } = run;
  await readNodeInfo(paper, plan.copyId);
  run.save(`${plan.copyId}-before.png`, await screenshot(paper, plan.copyId));
  const clone = await duplicateInto(paper, plan.masterId, plan.parentId);
  const ids = { ...clone.map, [plan.masterId]: clone.id };
  await moveBefore(paper, clone.id, plan.copyId);
  await restore(paper, plan, ids);
  await deleteNodes(paper, [plan.copyId]);
  run.report(`Synced ${plan.copyPath}`);
  return clone.id;
}

// Paper renders edits a moment after it acknowledges them.
const RENDER_WAIT_MS = 1000;

async function saveAfter(
  run: SyncRun,
  synced: [SyncPlan, string][],
): Promise<void> {
  await wait(RENDER_WAIT_MS);
  for (const [plan, cloneId] of synced)
    run.save(`${plan.copyId}-after.png`, await screenshot(run.paper, cloneId));
}

// Stops at the first failure, so one surprise never repeats across every copy.
export async function applySync(
  run: SyncRun,
  plans: SyncPlan[],
): Promise<void> {
  const synced: [SyncPlan, string][] = [];
  try {
    for (const plan of plans) synced.push([plan, await applyOne(run, plan)]);
  } finally {
    await finishWorking(run.paper);
    await saveAfter(run, synced);
  }
}
