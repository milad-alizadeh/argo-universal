import type { PluginSettingValue } from '@repo/contracts/plugins';
import { MemorySecretStore } from '@repo/engine/mocks/secret-store';
import {
  pluginSettingsSecretService,
  type SecretStore,
} from '@repo/engine/plugins';
import { isSecretSetting, type ConfiguredTest } from './test-configuration';

export type HostedTest = ConfiguredTest & { secretStore: SecretStore };

const secretSettings = (
  options: ConfiguredTest,
): [string, PluginSettingValue][] =>
  [...(options.settings ?? [])].filter(([key]) =>
    isSecretSetting(options, options.pluginId, key),
  );

// The test's secret store, holding its secret Setting values where the Server keeps them, so the Plugin reads them as it would.
export async function secretStoreFor(
  options: ConfiguredTest,
): Promise<HostedTest> {
  const secretStore = options.secretStore ?? new MemorySecretStore();
  const service = pluginSettingsSecretService(options.pluginId);

  await Promise.all(
    secretSettings(options).map(([key, value]) =>
      secretStore.set(service, key, String(value)),
    ),
  );

  return { ...options, secretStore };
}
