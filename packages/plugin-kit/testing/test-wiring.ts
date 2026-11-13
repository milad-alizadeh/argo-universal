import { resolve } from 'node:path';
import {
  testAccounts,
  type TestAccounts,
} from '@repo/engine/mocks/test-accounts';
import {
  HeldSecrets,
  type PluginRuntime,
  type PluginService,
  type SecretStore,
} from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';
import { runtimeFor, type RuntimeParts } from './test-runtime';
import { serviceFor } from './test-services';

export type Wiring = {
  accountStore: TestAccounts;
  runtime: PluginRuntime;
  service: PluginService;
};

function storeFor(
  home: string,
  options: ConfiguredTest,
  secretStore: SecretStore,
): TestAccounts {
  const store = testAccounts({
    home,
    version: options.version,
    firstPartyPluginsDirectory: resolve(options.directory),
    secretStore,
  });

  store.syncProjects(options.projects);

  return store;
}

function holding(
  store: SecretStore,
): Pick<RuntimeParts, 'heldSecrets' | 'secretStore'> {
  const heldSecrets = new HeldSecrets();

  return { heldSecrets, secretStore: heldSecrets.keeping(store) };
}

/*
 * The Accounts, runtime and service a Plugin's test runs on, sharing one secret store and one set of Projects. Every
 * Secret the store reads or writes is held, as the Server holds it (ADR-0051).
 */
export function wireTest(
  home: string,
  options: ConfiguredTest,
  store: SecretStore,
): Wiring {
  const held = holding(store);
  const accountStore = storeFor(home, options, held.secretStore);
  const { accounts } = accountStore;
  const runtime = runtimeFor(home, options, { ...held, accounts });

  return {
    accountStore,
    runtime,
    service: serviceFor(home, options, { runtime, accounts }),
  };
}
