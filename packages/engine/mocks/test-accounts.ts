import { join } from 'node:path';
import { openDatabase, type Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { createActor } from 'xstate';
import { PluginAccounts } from '../src/plugins/accounts/plugin-accounts';
import { discoverPlugins } from '../src/plugins/discovery/loader';
import { pluginManifest } from '../src/plugins/located-plugins';
import type { Keychain } from '../src/plugins/services/keychain';
import { writerMachine, type WriterActorRef } from '../src/storage';

type Source = {
  home: string;
  version: string;
  firstPartyPluginsDirectory: string;
  keychain: Keychain;
};

export type { PluginAccounts };

export type TestAccounts = {
  accounts: PluginAccounts;
  // Makes these the registered Projects: an Account can be chosen only for one the database holds.
  syncProjects: (projects: { id: string; name: string }[]) => void;
  close: () => void;
};

type Store = { database: Database; writer: WriterActorRef };

function openStore(home: string): Store {
  const database = openDatabase(join(home, 'accounts.db'));

  const writer = createActor(writerMachine, {
    input: { database, now: Date.now, log: () => {} },
  }).start();

  return { database, writer };
}

type Discovery = Parameters<typeof discoverPlugins>[0];

function firstPartyIn(
  discovery: Discovery,
): (pluginId: string) => Promise<boolean> {
  return async (pluginId) =>
    (await discoverPlugins(discovery)).plugins.some(
      (plugin) => plugin.manifest.id === pluginId && plugin.firstParty,
    );
}

function accountsOver(store: Store, source: Source): PluginAccounts {
  const { home, version, firstPartyPluginsDirectory } = source;
  const discovery = { home, version, firstPartyPluginsDirectory };

  return new PluginAccounts({
    database: store.database,
    databaseWriter: store.writer,
    keychain: source.keychain,
    manifest: (pluginId) => pluginManifest(discovery, pluginId),
    firstParty: firstPartyIn(discovery),
  });
}

function projectsIn(database: Database): TestAccounts['syncProjects'] {
  return (projects): void => {
    database.delete(project).run();

    for (const { id, name } of projects)
      database
        .insert(project)
        .values({ id, name, path: `/test-projects/${id}` })
        .run();
  };
}

// The real Account inventory over a throwaway database and Writer, so a Plugin's own tests sign in and borrow as the Engine does.
export function testAccounts(source: Source): TestAccounts {
  const store = openStore(source.home);

  return {
    accounts: accountsOver(store, source),
    syncProjects: projectsIn(store.database),
    close: (): void => {
      store.writer.stop();
      store.database.$client.close();
    },
  };
}
