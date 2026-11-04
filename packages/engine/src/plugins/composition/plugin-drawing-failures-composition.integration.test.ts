import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed } from '#mocks/probe-plugin';

// Two Loader pages that throw, a live page whose Loader throws after its first tree, and one that draws.
const failingPages = `
    import { Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    const render = (text) => jsx(Text, { children: text });
    export function register(argo) {
      argo.pages.define('/map', { load: () => { throw new Error('The map threw'); }, render });
      argo.pages.define('/files', { load: () => { throw new Error('The files threw'); }, render });
      argo.pages.define('/tail', {
        load: async function* () { yield 'first'; throw new Error('The tail threw'); },
        render,
      });
      argo.pages.define('/', { load: () => 'drawn', render });
    }`;

const address = (path: string) => ({ pluginId: 'probe', path, pageState: {} });

const at = (path: string) => ({ ...address(path), pages: 1 });

it('shows one drawing failure for a Plugin whose pages fail, live or not, and keeps its other pages drawing', async () => {
  const fixture = await installed(failingPages);
  const { caller, createCaller } = await startEngineTestHost({
    home: fixture.home,
  });
  const watching = new AbortController();
  const listened = createCaller({ signal: watching.signal });
  const failures = (await listened.plugins.failures())[Symbol.asyncIterator]();
  const seen: PluginFailure[][] = [];

  void (async (): Promise<void> => {
    for (
      let next = await failures.next();
      !next.done;
      next = await failures.next()
    )
      seen.push(next.value);
  })();

  await expect(caller.plugins.draw(at('/map'))).resolves.toMatchObject({
    kind: 'failed',
    error: 'The map threw',
  });
  await expect(caller.plugins.draw(at('/files'))).resolves.toMatchObject({
    kind: 'failed',
  });
  await expect(caller.plugins.draw(at('/'))).resolves.toMatchObject({
    kind: 'tree',
  });

  await expect
    .poll(() => seen.at(-1))
    .toEqual([
      expect.objectContaining({
        kind: 'drawing',
        pluginId: 'probe',
        message: 'The files threw',
      }),
    ]);

  const live = (await caller.plugins.live(address('/tail')))[
    Symbol.asyncIterator
  ]();
  const answers = [await live.next(), await live.next()].map(
    ({ value }) => value?.kind,
  );

  expect(answers).toEqual(['tree', 'failed']);
  await expect
    .poll(() => seen.at(-1))
    .toEqual([
      expect.objectContaining({ kind: 'drawing', message: 'The tail threw' }),
    ]);
  watching.abort();
}, 30_000);
