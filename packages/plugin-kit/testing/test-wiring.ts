import { resolve } from 'node:path';
import {
  testAccounts,
  type TestAccounts,
} from '@repo/engine/mocks/test-accounts';
import type {
  PluginRuntime,
  PluginService,
  SecretStore,
} from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';
import { runtimeFor } from './test-runtime';
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

// The Accounts, runtime and service a Plugin's test runs on, sharing one secret store and one set of Projects.
export function wireTest(
  home: string,
  options: ConfiguredTest,
  secretStore: SecretStore,
): Wiring {
  const accountStore = storeFor(home, options, secretStore);
  const { accounts } = accountStore;
  const runtime = runtimeFor(home, options, { secretStore, accounts });

  return {
    accountStore,
    runtime,
    service: serviceFor(home, options, { runtime, accounts }),
  };
}
