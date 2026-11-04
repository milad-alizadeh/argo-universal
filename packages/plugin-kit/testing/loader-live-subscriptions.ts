import type { HashedTree } from '@repo/contracts/plugins/page-draw';
import {
  liveTreeAfter,
  type LiveAnswer,
} from '@repo/contracts/plugins/page-live';
import { onTestFinished } from 'vitest';
import type { Kit } from './loader-live-fixture';

// How the kit's live page tests follow a page and read what it answers (ADR-0050).

// Real time a frame waits for the worker before the Plugin clock closes it.
const frameWaitMs = 20;

const liveFrameMs = 16;

/*
 * The next answer on a live subscription. Frames close on the Plugin clock, so the clock moves a frame on
 * each time the answer has not come yet.
 */
async function nextAnswer(
  kit: Kit,
  answers: AsyncGenerator<LiveAnswer>,
): Promise<LiveAnswer | undefined> {
  const pending = answers.next();
  const settled = pending.then(() => true);

  for (;;) {
    const waited = new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), frameWaitMs);
    });

    if (await Promise.race([settled, waited])) return (await pending).value;

    await kit.clock.advance(liveFrameMs);
  }
}

// How often each live Loader's `finally` ran, as `log,rows`.
export async function finished(kit: Kit): Promise<string> {
  const answer = await kit.pages.draw({ path: '/finished' });

  const title = answer.kind === 'tree' ? answer.root.props.title : undefined;

  return typeof title === 'string' ? title : answer.kind;
}

type Subscription = {
  next: () => Promise<LiveAnswer | undefined>;
  // The next answer as it comes, with the Plugin clock left alone, as while the Plugin restarts.
  ended: () => Promise<LiveAnswer | undefined>;
  leave: () => void;
};

export function subscribe(
  kit: Kit,
  path: string,
  known?: string,
): Subscription {
  const controller = new AbortController();
  const answers = kit.pages.live({ path, known }, controller.signal);

  onTestFinished(() => controller.abort());

  return {
    next: () => nextAnswer(kit, answers),
    ended: () => endedOf(answers),
    leave: () => controller.abort(),
  };
}

async function endedOf(
  answers: AsyncGenerator<LiveAnswer>,
): Promise<LiveAnswer | undefined> {
  const next = await answers.next();

  return next.done === true ? undefined : next.value;
}

const isKind =
  <Kind extends LiveAnswer['kind']>(kind: Kind) =>
  (
    answer: LiveAnswer | undefined,
  ): answer is Extract<LiveAnswer, { kind: Kind }> =>
    answer?.kind === kind;

const isTree = isKind('tree');

const isPatch = isKind('patch');

export function treeOf(answer: LiveAnswer | undefined): HashedTree {
  if (!isTree(answer)) throw new Error(`Answered ${JSON.stringify(answer)}`);

  return { root: answer.root, hash: answer.hash };
}

export function patched(
  kept: HashedTree,
  answer: LiveAnswer | undefined,
): HashedTree {
  if (!isPatch(answer)) throw new Error(`Answered ${JSON.stringify(answer)}`);

  const after = liveTreeAfter(kept, answer);

  if (!after) throw new Error('The patch does not fit the tree kept');

  return after;
}

export const rowsOf = ({ root }: HashedTree): unknown[] =>
  root.children.map((row) => row.props.title);
