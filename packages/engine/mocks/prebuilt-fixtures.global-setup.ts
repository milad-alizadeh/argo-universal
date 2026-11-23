import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildTestRepositoryTemplates,
  prebuiltRepositoriesVariable,
} from '@repo/git/test-git';
import { buildKit, prebuiltKitVariable } from '../src/plugins/kit/bundle';
import { migrateTemplateDatabase, prebuiltDatabaseVariable } from './database';

const migratedDatabase = (directory: string): string => {
  const file = join(directory, 'database', 'argo.db');

  mkdirSync(join(directory, 'database'));
  migrateTemplateDatabase(file);

  return file;
};

const bundledKit = async (directory: string): Promise<string> => {
  const file = join(directory, 'kit.js');

  writeFileSync(file, await buildKit());

  return file;
};

const builtRepositories = async (directory: string): Promise<string> => {
  const folder = join(directory, 'repositories');

  await buildTestRepositoryTemplates(folder);

  return folder;
};

/*
 * Builds once for the run what every test file would otherwise build in its first test: the Plugin kit bundle, the template
 * git repositories and the migrated database. Each worker reads them through the variables set here.
 */
export default async function setup(): Promise<() => void> {
  const directory = mkdtempSync(join(tmpdir(), 'argo-prebuilt-fixtures-'));

  const [kit, repositories] = await Promise.all([
    bundledKit(directory),
    builtRepositories(directory),
  ]);

  const prebuilt = {
    [prebuiltKitVariable]: kit,
    [prebuiltRepositoriesVariable]: repositories,
    [prebuiltDatabaseVariable]: migratedDatabase(directory),
  };

  Object.assign(process.env, prebuilt);

  return (): void => {
    for (const variable of Object.keys(prebuilt)) delete process.env[variable];
    rmSync(directory, { recursive: true, force: true });
  };
}
