import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import { startEngineTestHost } from './engine';
import { settingsProbe } from './plugin-settings';
import { createRuntimePlugins } from './runtime-plugins';

type PluginOperationsHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  operations: ReturnType<typeof createTRPCClient<AppRouter>>['operations'];
};

export async function startPluginOperations(): Promise<PluginOperationsHost> {
  const home = await createRuntimePlugins([settingsProbe]);
  const host = await startEngineTestHost({ home });
  const token = (await readFile(join(home, 'control.token'), 'utf8')).trim();

  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${host.url}/trpc`,
        headers: { authorization: `Bearer ${token}` },
      }),
    ],
  });

  return { ...host, operations: client.operations };
}
