import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { OAuthStart, OAuthResult } from '@repo/contracts/plugins/account-calls';
import { expect } from 'vitest';
import { z } from 'zod';
import { PluginTestClock } from '../src/plugins/worker/test-clock';
import { startEngineTestHost } from './engine';
import { createRuntimePlugins } from './runtime-plugins';

type StartRecord = z.infer<typeof StartedRecord>;

const StartedRecord = OAuthStart.extend({ unknown: z.null() });

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

type Result = z.infer<typeof OAuthResult> | null;

type OAuthJourney = EngineHost & {
  clock: PluginTestClock;
  opened: string[];
  started: (id?: string) => Promise<StartRecord>;
  result: (id?: string) => Promise<Result>;
  failure: (id?: string) => Promise<string | null>;
};

export async function oauthPlugins(ids = ['alice']): Promise<OAuthJourney> {
  const home = await writeOAuthPlugins(ids);
  const clock = new PluginTestClock(0);
  const opened: string[] = [];

  const host = await oauthHost(home, clock, opened);

  await runProbes(host, ids);

  return oauthJourney(host, home, { clock, opened });
}

const oauthHost = (
  home: string,
  clock: PluginTestClock,
  opened: string[],
): Promise<EngineHost> =>
  startEngineTestHost({
    home,
    pluginClock: clock,
    pluginOAuth: {
      open: async (url) => {
        opened.push(url);
      },
    },
  });

const oauthJourney = (
  host: EngineHost,
  home: string,
  browser: { clock: PluginTestClock; opened: string[] },
): OAuthJourney => ({
  ...host,
  ...browser,
  started: startReader(home, browser.opened),
  result: settledReader(home, 'result', OAuthResult.nullable()),
  failure: settledReader(home, 'failure', z.string().nullable()),
});

// The one Operation each fixture Plugin declares: it starts a sign-in, as a sign-in page's button does.
const probe = {
  name: 'probe',
  label: 'Start a sign-in',
  description: 'Starts an OAuth exchange and waits for its callback.',
  tier: 'act' as const,
};

async function writeOAuthPlugins(ids: string[]): Promise<string> {
  const home = await realpath(
    await createRuntimePlugins(
      ids.map((id) => ({ id, fixture: 'healthy', operations: [probe] })),
    ),
  );

  for (const id of ids)
    await writeFile(
      join(home, 'shipped', id, 'index.mjs'),
      oauthSource(home, id),
    );

  return home;
}

const oauthSource = (home: string, id: string): string =>
  oauthSourceTemplate
    .replaceAll('$FIXTURE_HOME', home)
    .replaceAll('$FIXTURE_ID', id);

/*
 * The Operation answers once the exchange is started, as a sign-in's does, and the Plugin waits for the
 * callback past it: the exchange's later calls are the starting run's.
 */
const oauthSourceTemplate = `
    export function register(argo) {
      argo.operations.register('probe', async () => {
        const unknown = await argo.oauth.await('unissued-state', 'https://authorize.example/');
        const failure = { message: null };
        const start = await argo.oauth.start().catch((error) => { failure.message = error.message; return null; });
        await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/failure.json', JSON.stringify(failure.message));
        await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/start.json', JSON.stringify({ ...start, unknown }));
        void (async () => {
          const result = start && await argo.oauth.await(start.state, 'https://authorize.example/?state=' + start.state);
          await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/result.json', JSON.stringify(result));
        })();
        return null;
      });
    }
  `;

// Each Plugin's sign-in starts from a run on the Server Device, as a tap in its App there does.
async function runProbes(host: EngineHost, ids: string[]): Promise<void> {
  for (const id of ids)
    await host.caller.plugins.run({
      pluginId: id,
      operation: 'probe',
      args: {},
    });
}

const read = async (
  home: string,
  id: string,
  file: string,
): Promise<z.infer<ReturnType<typeof z.json>>> =>
  z
    .json()
    .parse(
      JSON.parse(
        await readFile(join(home, 'plugin-data', id, file + '.json'), 'utf8'),
      ),
    );

// A started exchange once the Plugin awaits it: a callback before the await would settle it unawaited.
function startReader(home: string, opened: string[]): OAuthJourney['started'] {
  return async (id = 'alice') => {
    await expect
      .poll(() => read(home, id, 'start').catch(() => null), {
        timeout: 10_000,
      })
      .not.toBeNull();

    const started = StartedRecord.parse(await read(home, id, 'start'));

    await expect
      .poll(() => openedFor(opened, started.state), { timeout: 10_000 })
      .toBe(true);

    return started;
  };
}

const openedFor = (opened: string[], state: string): boolean =>
  opened.some((url) => url.endsWith(`state=${state}`));

// What the Plugin wrote to `file` once it has written it.
const settledReader =
  <Value>(home: string, file: string, schema: z.ZodType<Value>) =>
  async (id = 'alice'): Promise<Value> => {
    await expect
      .poll(() => read(home, id, file).catch(() => 'pending'), {
        timeout: 10_000,
      })
      .not.toBe('pending');

    return schema.parse(await read(home, id, file));
  };

export const challenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');
