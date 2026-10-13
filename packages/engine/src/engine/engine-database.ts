import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { seedProject } from '../projects';

export type OpenDatabaseInput = { home: string };

export async function openEngineDatabase({
  home,
}: OpenDatabaseInput): Promise<Database> {
  const database = openDatabase(join(home, 'argo.db'));
  try {
    await seedProject(database);
    return database;
  } catch (error) {
    database.$client.close();
    throw error;
  }
}
