import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt, textOf } from '#mocks/plugin-pages';
import { installed } from '#mocks/probe-plugin';

/*
 * A page that draws from a Setting, as a sign-in page offers its OAuth button once the app's client ID is set, beside
 * a named read that counts how often it runs.
 */
const source = `
  import { Text } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  let reads = 0;
  export function register(argo) {
    const counted = argo.queries.define('counted', () => ++reads);
    argo.pages.define('/', {
      load: async ({ read }) =>
        ((await argo.settings.get('client-id')) ?? 'none') + ' after ' + (await read(counted({}))) + ' reads',
      render: (text) => jsx(Text, { children: text }),
    });
  }`;

const markWaitMs = 3_000;

// The next stale mark, or a failure naming what never came, well inside the test's own timeout.
async function nextMark<T>(marks: AsyncIterator<T>): Promise<T> {
  const late = Promise.withResolvers<never>();

  const timer = setTimeout(
    () => late.reject(new Error('No stale mark came')),
    markWaitMs,
  );

  try {
    return (await Promise.race([marks.next(), late.promise])).value;
  } finally {
    clearTimeout(timer);
  }
}

it('draws the Plugin’s pages again with a changed Setting, leaving its Queries as they were', async () => {
  const { home } = await installed(source, {
    settings: [{ key: 'client-id', type: 'secret', label: 'Client ID' }],
  });

  const engine = await startEngineTestHost({ home });
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const marks = (
    await engine.createCaller({ signal: controller.signal }).plugins.stale()
  )[Symbol.asyncIterator]();

  const page = pageAt('probe', '/');

  expect(textOf(await drawnRoot(engine.caller, page))).toBe(
    'none after 1 reads',
  );
  // The new worker's own mark.
  await nextMark(marks);
  await engine.caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'client-id',
    value: 'client-1',
  });

  expect(await nextMark(marks)).toEqual({ pluginId: 'probe' });
  expect(textOf(await drawnRoot(engine.caller, page))).toBe(
    'client-1 after 1 reads',
  );
}, 20_000);
