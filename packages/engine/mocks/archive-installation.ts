import { zipSync } from 'fflate';
import {
  installEntry,
  installationExecutable,
  installationPorts,
  startInstallEngine,
} from './installation';

const controlArchive = (name: string): Uint8Array =>
  zipSync({
    agent: installationExecutable,
    [name]: new TextEncoder().encode('{}'),
  });

const zipEntry = (): ReturnType<typeof installEntry> => {
  const entry = installEntry('binary');

  for (const recipe of Object.values(entry.distribution?.binary ?? {}))
    recipe.archive += '.zip';

  return entry;
};

export const startArchiveInstallEngine = async (
  name: string,
): ReturnType<typeof startInstallEngine> => {
  const host = await startInstallEngine(zipEntry(), {
    ...installationPorts,
    download: async () => controlArchive(name),
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });

  return host;
};
