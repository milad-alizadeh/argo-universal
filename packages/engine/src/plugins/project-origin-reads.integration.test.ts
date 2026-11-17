import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { makeResolvedTempFolderSync } from '@repo/mocks/fs/resolved-temp-folder';
import { expect, it, vi } from 'vitest';
import { MemorySecretStore } from '#mocks/memory-secret-store';
import {
  address,
  overview,
  pluginId,
  valueOf,
} from '#mocks/plugin-data-harness';
import { startProjectTestHost } from '#mocks/project-host';
import { PluginAssets } from './assets/plugin-assets';
import { PluginData } from './data/plugin-data';
import { projectPorts } from './project-ports';
import { WorkerCalls } from './runtime/worker-calls';
import { PluginServices } from './services/plugin-services';
import { PluginStorage } from './services/storage';

const clock = {
  now: (): number => 0,
  delay: async (): Promise<void> => {},
  schedule: (): (() => null) => () => null,
};

type Composed = {
  services: PluginServices;
  data: PluginData;
  sent: PluginEvent[];
  readOrigin: ReturnType<typeof vi.fn<(path: string) => Promise<null>>>;
};

// The Project ports and services as the Server composes them, over a real database, with an origin reader that counts.
async function composed(): Promise<Composed> {
  const { database, databaseWriter } = await startProjectTestHost();
  const home = makeResolvedTempFolderSync('origin-reads-');
  const readOrigin = vi.fn<(path: string) => Promise<null>>(async () => null);
  const ports = projectPorts({ database, databaseWriter, readOrigin });

  const services = new PluginServices(
    new PluginStorage(home),
    new MemorySecretStore(),
    { ...ports, assets: new PluginAssets(home), log: (): void => {} },
  );

  const sent: PluginEvent[] = [];

  const workers = new WorkerCalls({
    clock,
    send: (_id, event): void => void sent.push(event),
  });

  const data = new PluginData(
    { services, clock, log: (): void => {}, during: runNow },
    workers,
    () => {},
  );

  workers.run(pluginId, 1);

  return { services, data, sent, readOrigin };
}

const runNow = <T>(call: () => Promise<T>): Promise<T> => call();

const caller = { pluginId, generation: 1 };

it('reads no origin for a cache-hit Query read, an argo.fetch naming a Project, or the Project ids a refresh reads', async () => {
  const { services, data, sent, readOrigin } = await composed();

  const read = (): ReturnType<PluginData['handle']> =>
    data.handle(
      caller,
      { api: 'data', action: 'read', query: overview, fresh: false },
      { drawn: { draw: 1, holder: address } },
    );

  const first = read();

  const asked = await vi.waitFor(() => {
    const event = sent.find((one) => one.type === 'read');

    if (event?.type !== 'read') throw new Error('No named read asked yet');

    return event;
  });

  data.reads.receive(caller, {
    action: 'read',
    id: asked.id,
    value: { count: 1 },
  });
  await first;

  expect(valueOf(await read())).toEqual({ count: 1 });

  await services.handle(pluginId, 1, {
    api: 'fetch',
    call: { url: 'http://127.0.0.1:9/', projectId: 'project-1' },
  });

  // What `refreshProjects` reads to sync the background passes.
  expect(await services.projectIds()).toEqual(['project-1']);

  expect(readOrigin).not.toHaveBeenCalled();

  await services.projectInfo();

  expect(readOrigin).toHaveBeenCalledTimes(1);
});
