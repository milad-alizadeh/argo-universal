import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { project } from '@repo/db/schema';
import { createActor } from 'xstate';
import { PluginAccounts } from '../src/plugins/accounts/plugin-accounts';
import { discoverPlugins } from '../src/plugins/discovery/loader';
import { pluginManifest } from '../src/plugins/located-plugins';
import type { Keychain } from '../src/plugins/services/keychain';
import { writerMachine } from '../src/storage';

type Source = {
  home: string;
  version: string;
  firstPartyPluginsDirectory: string;
  keychain: Keychain;
};

export type TestAccounts = {
  accounts: PluginAccounts;
  // Makes these the registered Projects: an Account can be chosen only for one the database holds.
  syncProjects: (projects: { id: string; name: string }[]) => void;
  close: () => void;
};

// The real Account inventory over a throwaway database and Writer, so a Plugin's own tests sign in and borrow as the Engine does.
export function testAccounts(source: Source): TestAccounts {
  const database = openDatabase(join(source.home, 'accounts.db'));
  const databaseWriter = createActor(writerMachine, {
    input: { database, now: Date.now, log: () => {} },
  }).start();

  const discovery = {
    home: source.home,
    version: source.version,
    firstPartyPluginsDirectory: source.firstPartyPluginsDirectory,
  };

  const accounts = new PluginAccounts({
    database,
    databaseWriter,
    keychain: source.keychain,
    manifest: (pluginId) => pluginManifest(discovery, pluginId),
    firstParty: async (pluginId) =>
      (await discoverPlugins(discovery)).plugins.some(
        (plugin) => plugin.manifest.id === pluginId && plugin.firstParty,
      ),
  });

  return {
    accounts,
    syncProjects: (projects) => {
      database.delete(project).run();

      for (const { id, name } of projects)
        database
          .insert(project)
          .values({ id, name, path: `/test-projects/${id}` })
          .run();
    },
    close: () => {
      databaseWriter.stop();
      database.$client.close();
    },
  };
}
