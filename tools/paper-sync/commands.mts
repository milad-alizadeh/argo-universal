import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { discover } from './catalog.mts';
import type { PaperClient } from './client.mts';
import { registryInScope } from './config.mts';
import { enrollmentSchema } from './enrollment-model.mts';
import { enrollCatalog } from './enrollment.mts';
import type { Registry } from './model.mts';
import { report } from './report.mts';
import { readIndices } from './scan.mts';
import { loadRegistry, saveJson } from './storage.mts';

export type CommandOptions = {
  cache: string;
  registry: string;
  directory: string;
  rebind: boolean;
};

async function previous(path: string): Promise<Registry> {
  try {
    return await loadRegistry(path);
  } catch (error) {
    if (missingFile.safeParse(error).success)
      return { version: 1, families: [] };
    throw error;
  }
}

export async function enrollCommand(
  client: PaperClient,
  options: CommandOptions,
): Promise<void> {
  const pages = await readIndices(options.cache);
  const catalog = discover(pages);

  const prior = await previous(options.registry);

  const result = await enrollCatalog(client, catalog, {
    previous: registryInScope(prior, catalog.nodes),
    rebind: options.rebind,
  });

  await saveJson(options.registry, result.registry);
  await saveJson(join(options.cache, 'enrollment.json'), result);
  await report(catalog, result, { pages, directory: options.directory });
}

export async function reportCommand(options: CommandOptions): Promise<void> {
  const pages = await readIndices(options.cache);

  const enrollment = enrollmentSchema.parse(
    JSON.parse(await readFile(join(options.cache, 'enrollment.json'), 'utf8')),
  );

  const catalog = discover(pages);

  enrollment.registry = registryInScope(
    await loadRegistry(options.registry),
    catalog.nodes,
  );
  await report(catalog, enrollment, {
    pages,
    directory: options.directory,
  });
}

const missingFile = z.object({ code: z.literal('ENOENT') });
