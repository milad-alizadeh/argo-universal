import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginManifest } from '@repo/contracts/plugins';
import {
  pluginOperationTypes,
  pluginTypesFile,
} from '@repo/contracts/plugins/plugin-operation-types';
import type { PluginValidation } from '@repo/engine/plugin-validation';
import { readPluginManifest } from '@repo/engine/plugins';

const written = (path: string): Promise<string | null> =>
  readFile(path, 'utf8').catch(() => null);

// Why the file on disk is not what the manifest makes, or null when it is.
async function typesProblem(
  directory: string,
  manifest: PluginManifest,
): Promise<string | null> {
  const expected = pluginOperationTypes(manifest);
  const actual = await written(join(directory, pluginTypesFile));

  if (actual === expected) return null;

  return expected === null
    ? `${pluginTypesFile} declares Operations plugin.json no longer has. Run argo-plugin types.`
    : `${pluginTypesFile} is missing or stale. Run argo-plugin types.`;
}

// `validate` fails while the types are not the manifest's, or the type check reads Operations the Plugin lacks.
export async function typesDiagnostics(
  directory: string,
  manifest: PluginManifest,
): Promise<PluginValidation['diagnostics']> {
  const problem = await typesProblem(directory, manifest);
  const file = join(directory, pluginTypesFile);

  return problem ? [{ file, line: 1, column: 1, message: problem }] : [];
}

/*
 * `argo-plugin types <dir>` writes the manifest's file, or removes one left from Operations it no longer
 * declares; with `--check` it writes nothing and fails while the file is not the manifest's.
 */
export async function types(
  directory: string,
  write: (line: string) => void,
  check: boolean,
): Promise<number> {
  const manifest = await readPluginManifest(directory, '0.0.0');

  if (check) return checked(await typesProblem(directory, manifest), write);

  await writeTypes(directory, pluginOperationTypes(manifest));
  write(`Wrote the Operation types for ${directory}`);

  return 0;
}

function checked(
  problem: string | null,
  write: (line: string) => void,
): number {
  if (problem) write(problem);

  return Number(problem !== null);
}

const writeTypes = (directory: string, types: string | null): Promise<void> =>
  types === null
    ? rm(join(directory, pluginTypesFile), { force: true })
    : writeFile(join(directory, pluginTypesFile), types);
