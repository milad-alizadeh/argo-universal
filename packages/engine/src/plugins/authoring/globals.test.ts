import { expect, it } from 'vitest';
import { inspectGlobals } from './globals';

const refusals = async (source: string): Promise<string[]> =>
  (await inspectGlobals({ file: 'index.ts', source })).map(
    ({ message }) => message,
  );

it.each([
  ['new URL(typed).host', 'URL', 'siteHost in plugins/jira/atlassian.ts'],
  ["btoa('ada:token')", 'btoa', 'basicCredential in plugins/jira/atlassian.ts'],
  ["new TextEncoder().encode('ada')", 'TextEncoder', 'encodeURIComponent'],
  ["fetch('https://api.example')", 'fetch', 'argo.fetch'],
  ['setInterval(tick, 1000)', 'setInterval', '`every`'],
])('refuses %s, naming what to use instead', async (code, name, fix) => {
  const [message] = await refusals(`export const value = ${code};`);

  expect(message).toContain(`Node global ${name} is unavailable`);
  expect(message).toContain(fix);
});

it('names argo and the built-ins for a global with no fix of its own', async () => {
  expect(await refusals('export const value = performance.now();')).toEqual([
    'Node global performance is unavailable: a Plugin has only JavaScript’s own built-ins, setTimeout and argo. Instead, use argo or JavaScript’s own built-ins.',
  ]);
});

it('leaves a local name alone', async () => {
  expect(
    await refusals('const URL = (host) => host; export const value = URL(1);'),
  ).toEqual([]);
});
