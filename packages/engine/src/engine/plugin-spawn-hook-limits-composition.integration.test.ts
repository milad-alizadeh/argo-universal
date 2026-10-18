import { expect, it } from 'vitest';
import type { HookPlugin } from '#mocks/hook-plugins';
import { refusal } from '#mocks/probe-run';
import {
  echo,
  probeEchoing,
  runWithHooks,
  spawnHook,
} from '#mocks/spawn-hooks';

// Each journey starts the calling Plugin and every Plugin that hooks its command.
const journeyMs = 30_000;

const guardFailed = 'a process.spawn Hook blocked it: A guard Hook failed';

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
  'keeps a guard refusing once its Plugin has crashed, until it runs again',
  async () => {
    const { results, log } = await runWithHooks(
      [
        spawnHook(
          'guard',
          `() => { const held = []; for (;;) held.push(new Array(1e6).fill(1)); }`,
          '{ guard: true }',
        ),
      ],
      probeEchoing('again'),
    );

    expect(results).toEqual({
      echo: refusal(guardFailed),
      again: refusal(guardFailed),
    });
    expect(log).toContain(
      'Plugin guard: guard refused process.spawn Hook: the Plugin is not running',
    );
  },
  journeyMs,
);

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

it(
  'does not charge a Hook for the time its own argo call takes',
  async () => {
    const { results } = await runWithHooks([
      {
        ...spawnHook(
          'patient',
          `async (ctx, e, next) => { await argo.process.run(['sleep', '10.5']); return next({ ...e, argv: [...e.argv, 'waited'] }); }`,
        ),
        capabilities: sleepy('patient').capabilities,
      },
    ]);

    expect(results).toEqual({ echo: { value: 'hi waited' } });
  },
  journeyMs,
);
