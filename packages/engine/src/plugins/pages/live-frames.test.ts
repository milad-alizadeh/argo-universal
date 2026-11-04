import { liveTreeAfter, treeAnswer } from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { PluginTestClock } from '../worker/test-clock';
import { LatestFrames, liveAnswers, liveFrameMs } from './live-frames';

const row = (title: string): WireNode => ({
  type: 'ListItem',
  key: title,
  props: { title },
  children: [],
  slots: {},
});

// The hash the Contracts give a tree, as a whole-tree answer names it.
const hashOf = (root: WireNode): string =>
  treeAnswer(root, undefined, undefined).hash;

const list = (...titles: string[]): WireNode => ({
  type: 'List',
  key: 'list',
  props: {},
  children: titles.map(row),
  slots: {},
});

type Live = {
  clock: PluginTestClock;
  frames: LatestFrames;
  answers: ReturnType<typeof liveAnswers>;
  stops: () => number;
  controller: AbortController;
};

// A live subscription over frames a test pushes, whose trees pass their checks unless they are a Text.
function live(known?: string): Live {
  const clock = new PluginTestClock();
  const frames = new LatestFrames(clock);
  const controller = new AbortController();
  let stops = 0;

  const answers = liveAnswers({
    frames,
    known,
    signal: controller.signal,
    check: (root) =>
      (root as WireNode).type === 'Text'
        ? { ok: false, error: 'Refused' }
        : { ok: true, root: root as WireNode, pages: 0 },
    stop: () => {
      stops += 1;
    },
  });

  return { clock, frames, answers, stops: () => stops, controller };
}

it('sends the first tree whole, then one patch a frame from the latest tree', async () => {
  const { clock, frames, answers } = live();
  const first = answers.next();

  frames.push(list('a'));
  await clock.advance(liveFrameMs);
  expect((await first).value).toEqual({
    kind: 'tree',
    root: list('a'),
    hash: hashOf(list('a')),
  });

  const second = answers.next();

  frames.push(list('a', 'b'));
  frames.push(list('a', 'b', 'c'));
  await clock.advance(liveFrameMs);
  const patch = (await second).value;

  expect(patch).toMatchObject({
    kind: 'patch',
    base: hashOf(list('a')),
    hash: hashOf(list('a', 'b', 'c')),
    ops: [{ op: 'insert' }, { op: 'insert' }],
  });
  if (patch?.kind !== 'patch') throw new Error('No patch');
  expect(
    liveTreeAfter({ root: list('a'), hash: hashOf(list('a')) }, patch)?.root,
  ).toEqual(list('a', 'b', 'c'));
});

it('answers unchanged for the tree the App keeps, and nothing for a tree the same as the last', async () => {
  const { clock, frames, answers } = live(hashOf(list('a')));
  const first = answers.next();

  frames.push(list('a'));
  await clock.advance(liveFrameMs);
  expect((await first).value).toEqual({
    kind: 'unchanged',
    hash: hashOf(list('a')),
  });

  const next = answers.next();

  frames.push(list('a'));
  await clock.advance(liveFrameMs);
  frames.push(list('b'));
  await clock.advance(liveFrameMs);
  expect((await next).value).toMatchObject({
    kind: 'patch',
    hash: hashOf(list('b')),
  });
});

it('sends the open frame before a Loader that ended, then ends quietly and stops the worker', async () => {
  const { frames, answers, stops } = live();

  frames.push(list('a'));
  frames.end({ action: 'ended', id: 1 });

  expect((await answers.next()).value).toMatchObject({ kind: 'tree' });
  expect(await answers.next()).toEqual({ done: true, value: undefined });
  expect(stops()).toBe(1);
});

it('answers why a Loader failed, a tree was refused or its Plugin stopped', async () => {
  const thrown = live();

  thrown.frames.end({ action: 'failed', id: 1, error: 'GitHub refused' });
  expect((await thrown.answers.next()).value).toEqual({
    kind: 'failed',
    error: 'GitHub refused',
  });

  const refused = live();

  refused.frames.push({ ...row('a'), type: 'Text' });
  refused.frames.end({ action: 'ended', id: 1 });
  expect((await refused.answers.next()).value).toEqual({
    kind: 'failed',
    error: 'Refused',
  });
  expect(await refused.answers.next()).toMatchObject({ done: true });
  expect(refused.stops()).toBe(1);

  const stopped = live();

  stopped.frames.end({ ok: false, error: 'Plugin stopped' });
  expect((await stopped.answers.next()).value).toEqual({
    kind: 'failed',
    error: 'Plugin stopped',
  });
});

it('stops the worker and ends when the App leaves', async () => {
  const { answers, controller, stops } = live();
  const waiting = answers.next();

  controller.abort();

  expect(await waiting).toEqual({ done: true, value: undefined });
  expect(stops()).toBeGreaterThanOrEqual(1);
});
