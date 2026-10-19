import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { PaperClient } from './client.mts';
import { fileSchema, indexPage, type IndexedNode } from './discover.mts';
import { composer, enrollButtons, foundations } from './enrollment.mts';
import type { Registry } from './model.mts';
import { loadRegistry, saveJson, syncRegistry } from './run.mts';

const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory, '../..');
const [command = 'check', ...args] = process.argv.slice(2);
function option(name: string, fallback: string): string {
  return (
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ??
    fallback
  );
}
const registryPath = resolve(
  option('registry', join(directory, 'button.registry.json')),
);
const cache = resolve(option('cache', join(root, '.paper-sync', 'inventory')));
const runDirectory = join(
  root,
  '.paper-sync',
  new Date().toISOString().replaceAll(':', '-'),
);
const indexedSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    component: z.string(),
    parentId: z.string().nullable(),
  }),
);

async function scan(client: PaperClient): Promise<void> {
  for (const fileId of [foundations, composer]) {
    const info = await client.read('get_basic_info', { fileId }, fileSchema);
    const nodes: IndexedNode[] = [];
    for (const page of info.pages.filter((page) => page.type === 'page')) {
      const details = await client.read(
        'get_basic_info',
        { fileId, pageId: page.id },
        fileSchema,
      );
      for (const artboard of details.artboards)
        nodes.push(...(await indexPage(client, fileId, artboard.id)));
    }
    await saveJson(join(cache, `${fileId}-index.json`), nodes);
    console.log(`${info.fileName}: indexed ${nodes.length} nodes`);
  }
}

async function enroll(client: PaperClient): Promise<void> {
  const indices = new Map<string, IndexedNode[]>();
  for (const fileId of [foundations, composer])
    indices.set(
      fileId,
      indexedSchema.parse(
        JSON.parse(await readFile(join(cache, `${fileId}-index.json`), 'utf8')),
      ),
    );
  let previous: Registry = { version: 1, families: [] };
  try {
    previous = await loadRegistry(registryPath);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  const { registry, excluded } = await enrollButtons(client, indices, previous);
  await saveJson(registryPath, registry);
  await saveJson(join(cache, 'excluded.json'), excluded);
  console.log(
    `Registered ${registry.families.reduce((sum, family) => sum + family.copies.length, 0)} copies. Exclusions: ${excluded.length}`,
  );
}

if (!['scan', 'enroll', 'check', 'apply'].includes(command))
  throw new Error(
    'Usage: node tools/paper-sync/cli.mts scan|enroll|check|apply [--registry=path] [--cache=path]',
  );
const client = new PaperClient();
await client.connect();
if (command === 'scan') await scan(client);
else if (command === 'enroll') await enroll(client);
else
  await syncRegistry(client, registryPath, command === 'apply', runDirectory);
