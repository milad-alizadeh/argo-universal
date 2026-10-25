import { expect, it } from 'vitest';
import type { HookPlugin } from '#mocks/hook-plugins';
import { echo, runWithHooks, spawnHook } from '#mocks/spawn-hooks';

// Each journey starts the calling Plugin and every Plugin that hooks its command.
const journeyMs = 30_000;

// A Plugin whose Hook sleeps for most of its budget before passing the event on.
const sleepy = (id: string): HookPlugin => ({
  ...spawnHook(
    id,
    `async (ctx, e, next) => { await argo.process.run(['sleep', '0.8']); return next(e); }`,
  ),
  capabilities: [
    { kind: 'process:exec', command: 'sleep', args: ['*'] },
    { kind: 'hook', event: 'process.spawn' },
  ],
});

// A Hook that runs its own command before passing the event on.
const echoingFirst = (text: string): string =>
  `async (ctx, e, next) => { await argo.process.run(['echo', '${text}']); return next(e); }`;

it(
  'ends a chain when two Plugins hook each other’s commands',
  async () => {
    const { results } = await runWithHooks(
      [
        { ...spawnHook('a-echoing', echoingFirst('a')), capabilities: [] },
        { ...spawnHook('b-echoing', echoingFirst('b')), capabilities: [] },
      ].map((plugin) => ({
        ...plugin,
        capabilities: [echo, { kind: 'hook', event: 'process.spawn' }],
      })),
    );

    expect(results).toEqual({ echo: { value: 'hi' } });
  },
  journeyMs,
);

it(
  'never counts a starting Plugin as hanging while Hooks answer its command',
  async () => {
    const { results } = await runWithHooks(
      ['a', 'b', 'c', 'd'].map((id) => sleepy(`${id}-sleepy`)),
    );

    expect(results).toEqual({ echo: { value: 'hi' } });
  },
  journeyMs,
);
