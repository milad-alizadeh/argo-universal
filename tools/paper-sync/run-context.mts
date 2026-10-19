import type { PaperClient } from './client.mts';
import { fileSchema } from './index-model.mts';
import type { Registry, Snapshot } from './model.mts';
import { SnapshotReader } from './snapshot-reader.mts';
import { readTokens, type Tokens } from './tokens.mts';

export type CheckError = {
  name: string;
  fileId: string;
  nodeId: string;
  reason: string;
};

export type RunContext = {
  reader: SnapshotReader;
  tokens: Map<string, Tokens>;
  masters: Map<string, Snapshot>;
  errors: CheckError[];
};

async function prepareFile(
  client: PaperClient,
  fileId: string,
): Promise<Tokens> {
  await client.read('get_basic_info', { fileId }, fileSchema);

  return readTokens(client, fileId);
}

async function readMaster(
  context: RunContext,
  family: Registry['families'][number],
): Promise<void> {
  try {
    context.masters.set(
      family.name,
      await context.reader.read(family.master.fileId, family.master.nodeId),
    );
  } catch (error) {
    const identity = { ...family.master, name: family.name };
    context.errors.push({ ...identity, reason: String(error) });
  }
}

function runContext(client: PaperClient, registry: Registry): RunContext {
  const reader = new SnapshotReader(
    client,
    new Set(registry.families.map((family) => family.name)),
  );

  return { reader, tokens: new Map(), masters: new Map(), errors: [] };
}

export async function prepareRun(
  client: PaperClient,
  registry: Registry,
): Promise<RunContext> {
  const context = runContext(client, registry);

  const ids = registryFiles(registry);

  for (const id of ids) context.tokens.set(id, await prepareFile(client, id));

  for (const family of registry.families.filter((item) => item.copies.length))
    await readMaster(context, family);

  return context;
}

function registryFiles(registry: Registry): Set<string> {
  return new Set(
    registry.families.flatMap((family) => [
      family.master.fileId,
      ...family.copies.map((copy) => copy.fileId),
    ]),
  );
}
