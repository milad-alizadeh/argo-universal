import { join } from 'node:path';
import { productCompatibility } from '@repo/contracts/product-identity';
import {
  type Database,
  lockDatabaseFolder,
  openDatabase,
  unlockDatabaseFolder,
} from '@repo/db';
import { seedProject } from '../projects';

export type OpenDatabaseInput = { home: string };

// One Engine owns a home: a second one stops here, before it migrates the database or recovers Turns another Engine is running.
export async function openEngineDatabase({
  home,
}: OpenDatabaseInput): Promise<Database> {
  lockDatabaseFolder(home);
  let database: Database | undefined;

  try {
    database = openDatabase(join(home, productCompatibility.databaseFile));
    // A first run starts with no Projects; the App adds them. The variable seeds one for tests, e2e and development.
    const seeded = process.env.ARGO_PROJECT_PATH;

    if (seeded) await seedProject(database, seeded);

    return database;
  } catch (error) {
    closeEngineDatabase(home, database);
    throw error;
  }
}

export function closeEngineDatabase(
  home: string,
  database: Database | null | undefined,
): void {
  database?.$client.close();
  unlockDatabaseFolder(home);
}
