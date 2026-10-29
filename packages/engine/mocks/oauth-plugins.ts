import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { OAuthStart, OAuthResult } from '@repo/contracts/plugins/account-calls';
import { expect, onTestFinished } from 'vitest';
import { z } from 'zod';
import { PluginTestClock } from '../src/plugins/worker/test-clock';
import { startEngineTestHost } from './engine';
import { createRuntimePlugins } from './runtime-plugins';

type StartRecord = z.infer<typeof StartedRecord>;

const StartedRecord = OAuthStart.extend({
  unknown: z.null(),
  serverDevice: z.literal(true),
});

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

  await openViews(host, ids);

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
  started: startReader(home),
  result: resultReader(home),
  failure: failureReader(home),
});

async function writeOAuthPlugins(ids: string[]): Promise<string> {
  const home = await realpath(
    await createRuntimePlugins(ids.map((id) => ({ id, fixture: 'healthy' }))),
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

const oauthSourceTemplate = `
    import { useEffect, Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) { argo.pages.register('/', function Page({ context }) {
      useEffect(() => { (async () => {
        const unknown = await argo.oauth.await('unissued-state', 'https://authorize.example/');
        const failure = { message: null };
        const start = await argo.oauth.start().catch((error) => { failure.message = error.message; return null; });
        await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/failure.json', JSON.stringify(failure.message));
        await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/start.json', JSON.stringify({ ...start, unknown, serverDevice: context.serverDevice }));
        const result = start && await argo.oauth.await(start.state, 'https://authorize.example/?state=' + start.state);
        await argo.fs.write('$FIXTURE_HOME/plugin-data/$FIXTURE_ID/result.json', JSON.stringify(result));
      })(); }, []); return jsx(Text, { children: 'Probe' });
    }); }
  `;

async function openViews(host: EngineHost, ids: string[]): Promise<void> {
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const caller = host.createCaller({ signal: controller.signal });

  for (const id of ids) {
    const view = await caller.plugins.view({ pluginId: id, path: '/' });
    await view[Symbol.asyncIterator]().next();
  }
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

function startReader(home: string): OAuthJourney['started'] {
  return async (id = 'alice') => {
    await expect
      .poll(() => read(home, id, 'start').catch(() => null), {
        timeout: 10_000,
      })
      .not.toBeNull();

    return StartedRecord.parse(await read(home, id, 'start'));
  };
}

function resultReader(home: string): OAuthJourney['result'] {
  return async (id = 'alice') => {
    await expect
      .poll(() => read(home, id, 'result').catch(() => 'pending'), {
        timeout: 10_000,
      })
      .not.toBe('pending');

    return OAuthResult.nullable().parse(await read(home, id, 'result'));
  };
}

function failureReader(home: string): OAuthJourney['failure'] {
  return async (id = 'alice') => {
    await expect
      .poll(() => read(home, id, 'failure').catch(() => 'pending'), {
        timeout: 10_000,
      })
      .not.toBe('pending');

    return z
      .string()
      .nullable()
      .parse(await read(home, id, 'failure'));
  };
}

export const challenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');
