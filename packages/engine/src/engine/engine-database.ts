import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { seedProject } from '../projects';

export type OpenDatabaseInput = { home: string };

export async function openEngineDatabase({
  home,
}: OpenDatabaseInput): Promise<Database> {
  const database = openDatabase(join(home, 'argo.db'));

  try {
    // A first run starts with no Projects; the App adds them. The variable seeds one for tests, e2e and development.
    const seeded = process.env.ARGO_PROJECT_PATH;

    if (seeded) await seedProject(database, seeded);

    return database;
  } catch (error) {
    database.$client.close();
    throw error;
  }
}
