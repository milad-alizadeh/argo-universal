import {
  startPluginTest,
  type PluginTest,
  type PluginTestOptions,
} from '@argo/plugin-kit/testing';
import type { PluginCapability } from '@repo/contracts/plugins';
import {
  dataFixture as writeDataFixture,
  dataPluginId,
  type Contributions,
  type DataFixture,
} from '@repo/engine/mocks/data-fixture';
import { onTestFinished } from 'vitest';

export {
  dataPage,
  dataPluginId,
  processPage,
  processWait,
} from '@repo/engine/mocks/data-fixture';

type HostedFixture = DataFixture & {
  start: (options?: Partial<PluginTestOptions>) => Promise<PluginTest>;
};

// The Engine writes the Plugin directory; the kit adds the host that runs it without a composed Engine.
export async function dataFixture(
  source: string,
  contributes: Contributions = {},
  capabilities: PluginCapability[] = [],
): Promise<HostedFixture> {
  const fixture = await writeDataFixture(source, contributes, capabilities);

  return {
    ...fixture,
    start: (options) => startFixture(fixture.directory, options),
  };
}

async function startFixture(
  directory: string,
  options: Partial<PluginTestOptions> = {},
): Promise<PluginTest> {
  const kit = await startPluginTest({
    directory,
    pluginId: dataPluginId,
    version: '0.0.0',
    clockStart: 0,
    path: [directory],
    ...options,
  });

  onTestFinished(() => kit.close());

  return kit;
}
