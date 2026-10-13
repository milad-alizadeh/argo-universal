import { expect, it } from 'vitest';
import { installEntry, startInstallEngine } from '#mocks/installation';
import { waitForInstalledSelection } from '#mocks/installation-storage';
import { nativeInstallationPorts } from '#mocks/npm-native-installation';
import {
  readInstallSelection,
  selectedLaunchDefinition,
} from './install/selection/selection';

it('persists and resolves a native npm bin replaced by package installation', async () => {
  const entry = installEntry('npx');
  const host = await startInstallEngine(entry, nativeInstallationPorts);
  await host.caller.agents.install({
    agentId: host.agentId,
    version: entry.version,
  });
  await waitForInstalledSelection(host);
  const selection = readInstallSelection(host.database, host.agentId);

  if (!selection) throw new Error('No installation was selected');

  const launch = await selectedLaunchDefinition(
    host.home,
    host.agentId,
    selection,
  );

  expect(launch.executable).toMatch(/native-agent$/);
  expect(launch.args).toEqual([]);
  expect(
    await host.caller.agents.installStatus({ agentId: host.agentId }),
  ).toMatchObject({
    installation: { status: 'installed' },
  });
});
