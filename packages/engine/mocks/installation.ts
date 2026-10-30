import type { ACPAgent } from '@repo/contracts';
import type { InstallPorts } from '../src/agents';

export { installationExecutable } from '@repo/mocks/registry/installation';

import { createInstallationPorts } from '@repo/mocks/registry/installation';

const fixturePackage = 'fixture-install';

export const installEntry = (kind: 'binary' | 'npx' | 'uvx'): ACPAgent => ({
  id: fixturePackage,
  name: 'Fixture ACP',
  version: '1.2.3',
  description: 'An external installer fixture',
  license_url: 'https://example.org/license',
  distribution: fixtureDistribution(kind),
});

const fixtureDistribution = (
  kind: 'binary' | 'npx' | 'uvx',
): ACPAgent['distribution'] => {
  if (kind !== 'binary') return packageDistribution(kind);

  return {
    binary: {
      [fixturePlatform()]: {
        archive: 'https://example.org/agent',
        cmd: './agent',
      },
    },
  };
};

const packageDistribution = (
  kind: 'npx' | 'uvx',
): ACPAgent['distribution'] => ({
  [kind]: {
    package:
      kind === 'npx' ? 'fixture-install@1.2.3' : 'fixture-install==1.2.3',
  },
});

export const installationPorts: InstallPorts = createInstallationPorts();

const fixturePlatform = (): string =>
  process.platform === 'win32'
    ? 'windows-x86_64'
    : `${process.platform}-${fixtureArchitecture()}`;

const fixtureArchitecture = (): string =>
  process.arch === 'arm64' ? 'aarch64' : 'x86_64';
