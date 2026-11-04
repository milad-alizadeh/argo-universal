import { readFile } from 'node:fs/promises';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { OAuthOptions } from '../src/plugins';
import { PluginTestClock } from '../src/plugins/worker/test-clock';
import { startEngineTestHost } from './engine';
import { startPluginRuntime } from './plugin-runtime-host';
import { installed, probeResult, probeSource } from './probe-plugin';

const calls = {
  start: 'argo.oauth.start()',
  wait: "argo.oauth.await('unissued', 'https://authorize.example/')",
};

export async function viewlessOAuth(): Promise<{
  opened: string[];
  result: Awaited<ReturnType<typeof probeResult>>;
}> {
  const fixture = await installed(probeSource(calls));
  const browser = recordBrowser();

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginClock: new PluginTestClock(0),
    pluginOAuth: browser.oauth,
  });

  await host.caller.plugin.activate({ pluginId: 'probe' });

  return { opened: browser.opened, result: await probeResult(fixture.data) };
}

type Runtime = ReturnType<typeof startPluginRuntime>;

type OriginJourney = {
  opened: string[];
  result: (server: boolean) => Promise<Json>;
  run: (
    name: string,
    params: JsonObject,
    serverDevice: boolean,
  ) => Promise<Json>;
};

// Two runs of one Operation at once, one asked from the Server Device and one from a paired device.
export async function overlappingOAuth(): Promise<OriginJourney> {
  const journey = await originJourney();

  await Promise.all(
    [true, false].map((serverDevice) =>
      journey.run('probe', { tag: String(serverDevice) }, serverDevice),
    ),
  );

  return journey;
}

// The origin probe, activated on a runtime whose runs say which device asked.
export async function originJourney(): Promise<OriginJourney> {
  const fixture = await installed(originSource);
  const browser = recordBrowser();

  const runtime = originRuntime(fixture.home, browser.oauth);

  await activateOrigin(runtime, fixture.code);

  return {
    opened: browser.opened,
    result: (server) => originResult(fixture.data, server),
    run: (name, params, serverDevice) =>
      originRun(runtime, { name, params, serverDevice }),
  };
}

const originRuntime = (home: string, oauth: OAuthOptions): Runtime =>
  startPluginRuntime(home, { clock: new PluginTestClock(0), oauth });

const activateOrigin = async (
  runtime: Runtime,
  directory: string,
): Promise<void> => {
  await runtime.activate({
    entry: { pluginId: 'probe', directory, main: 'index.mjs' },
  });
};

type OriginRun = { name: string; params: JsonObject; serverDevice: boolean };

async function originRun(runtime: Runtime, run: OriginRun): Promise<Json> {
  const params = z.record(z.string(), z.string()).parse(run.params);

  const answer = await runtime.operations.run('probe', {
    name: run.name,
    params,
    caller: {},
    serverDevice: run.serverDevice,
  });

  if (!answer.ok) throw new Error(answer.error);

  return answer.result;
}

type Browser = { opened: string[]; oauth: OAuthOptions };

const recordBrowser = (): Browser => {
  const opened: string[] = [];

  return {
    opened,
    oauth: {
      open: async (url: string): Promise<void> => {
        opened.push(url);
      },
    },
  };
};

const originResult = async (
  directory: string,
  server: boolean,
): Promise<Json> =>
  readFile(`${directory}/${server}.json`, 'utf8').then(
    (text) => z.json().parse(JSON.parse(text)),
    () => null,
  );

/*
 * `probe` makes each OAuth call across an await and writes what it got by its `tag`; `begin` starts an
 * exchange and answers its state at once, and `finish` awaits that state in a later run.
 */
const originSource = `
  export function register(argo) {
    argo.operations.register('probe', async ({ tag }) => {
      await argo.fs.write('$DATA/before-' + tag, 'await boundary');
      const result = {};
      for (const [name, call] of Object.entries({
        start: () => argo.oauth.start().then(value => Boolean(value)),
        wait: () => argo.oauth.await('unissued', 'https://authorize.example/'),
      })) result[name] = await call().then(value => ({value}), error => ({error: error.message}));
      await argo.fs.write('$DATA/' + tag + '.json', JSON.stringify(result));
      return null;
    });
    argo.operations.register('begin', async () => (await argo.oauth.start()).state);
    argo.operations.register('finish', ({ state }) =>
      argo.oauth.await(state, 'https://authorize.example/?state=' + state).catch((error) => error.message));
  }
`;
