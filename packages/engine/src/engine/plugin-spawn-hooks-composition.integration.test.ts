import { expect, it } from 'vitest';
import { refusal } from '#mocks/probe-run';
import { appending, runWithHooks, spawnHook } from '#mocks/spawn-hooks';

// Each journey starts the calling Plugin and every Plugin that hooks its command.
const journeyMs = 20_000;

const hookLines = (log: string, kind: string): string[] =>
  log.split('\n').filter((line) => line.includes(`: ${kind} process.spawn`));

it(
  'runs process.spawn Hooks in load order before the command runs',
  async () => {
    const { results } = await runWithHooks([
      spawnHook('a-first', appending('a')),
      spawnHook('b-second', appending('b')),
    ]);

    expect(results).toEqual({ echo: { value: 'hi a b' } });
  },
  journeyMs,
);

it(
  'checks the rewritten command against the calling Plugin, so a rewrite never widens it',
  async () => {
    const { results } = await runWithHooks([
      spawnHook('widen', `(ctx, e, next) => next({ ...e, argv: ['ls'] })`),
    ]);

    expect(results).toEqual({ echo: refusal('ls is not a declared command') });
  },
  journeyMs,
);

it(
  "lets a Hook block another Plugin's command",
  async () => {
    const { results, log } = await runWithHooks([
      spawnHook('block', `() => ({ blocked: 'not today' })`),
    ]);

    expect(results).toEqual({
      echo: refusal('a process.spawn Hook blocked it: not today'),
    });
    expect(log).toContain('Plugin probe: refused argo.process.run echo hi');
  },
  journeyMs,
);

it.each([
  {
    name: 'throws',
    hook: `() => { throw new Error('broken'); }`,
    reason: 'broken',
  },
  {
    name: 'answers the wrong shape',
    hook: `() => ({ argv: 'echo' })`,
    reason: 'answered the wrong shape',
  },
  {
    name: 'returns without next or an answer',
    hook: `() => {}`,
    reason: 'returned without calling next or answering',
  },
  {
    name: 'rewrites a field it may not',
    hook: `(ctx, e, next) => next({ ...e, pluginId: 'other' })`,
    reason: 'may not rewrite pluginId',
  },
  {
    name: 'misses its budget',
    hook: `() => new Promise(() => {})`,
    reason: 'missed its 10000 ms budget',
  },
])(
  'skips a Hook that $name, logs it once, and goes on',
  async ({ hook, reason }) => {
    const { results, log } = await runWithHooks([
      spawnHook('a-broken', hook),
      spawnHook('b-working', appending('b')),
    ]);

    expect(results).toEqual({ echo: { value: 'hi b' } });
    expect(hookLines(log, 'skipped')).toEqual([
      expect.stringContaining(`Plugin a-broken: skipped process.spawn Hook: `),
    ]);
    expect(hookLines(log, 'skipped')[0]).toContain(reason);
  },
  journeyMs,
);

it(
  'refuses with the event instead of skipping a guard Hook that fails',
  async () => {
    const { results, log } = await runWithHooks([
      spawnHook(
        'guard',
        `() => { throw new Error('broken'); }`,
        '{ guard: true }',
      ),
    ]);

    expect(results).toEqual({
      echo: refusal('a process.spawn Hook blocked it: A guard Hook failed'),
    });
    expect(hookLines(log, 'guard refused')).toEqual([
      expect.stringContaining(
        'Plugin guard: guard refused process.spawn Hook: broken',
      ),
    ]);
  },
  journeyMs,
);
