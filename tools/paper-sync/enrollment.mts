import { rejectAmbiguous } from './boundaries.mts';
import { key, type Catalog } from './catalog.mts';
import type { PaperClient } from './client.mts';
import { enrollCopy } from './enroll-copy.mts';
import type { Enrollment, EnrollmentContext } from './enrollment-model.mts';
import { repairMissing } from './enrollment-rebind.mts';
import type { LocatedNode } from './index-model.mts';
import type { Registry, Snapshot } from './model.mts';
import { SnapshotReader } from './snapshot-reader.mts';

function familyFor(master: LocatedNode): Registry['families'][number] {
  return {
    name: master.name,
    master: { fileId: master.fileId, nodeId: master.id },
    copies: [],
  };
}

async function enrollCopies(
  context: EnrollmentContext,
  master: LocatedNode,
  source: Snapshot,
): Promise<Registry['families'][number]> {
  const family = familyFor(master);

  const candidates = context.catalog.nodes.filter(
    (node) => node.name === master.name && key(node) !== key(master),
  );

  for (const candidate of candidates) {
    const binding = await enrollCopy(context, source, candidate);

    if (binding) family.copies.push(binding);
  }

  return family;
}

async function tryFamily(
  context: EnrollmentContext,
  master: LocatedNode,
): Promise<void> {
  try {
    await readFamily(context, master);
  } catch (error) {
    const { fileId, id: nodeId, name } = master;
    context.result.registry.families.push(familyFor(master));
    const identity = { fileId, nodeId, name };
    const reason = `Master: ${String(error)}`;
    context.result.excluded.push({ ...identity, reason });
  }
}

function enrollmentContext(
  client: PaperClient,
  catalog: Catalog,
  options: { previous: Registry; rebind: boolean },
): EnrollmentContext {
  const result = emptyEnrollment();

  const names = new Set(
    [...catalog.masters, ...catalog.duplicates.flat()].map((node) => node.name),
  );

  result.registry.ambiguousNames = [
    ...new Set(catalog.duplicates.flat().map((node) => node.name)),
  ];
  const reader = new SnapshotReader(client, names);

  return { ...options, catalog, result, reader };
}

export async function enrollCatalog(
  client: PaperClient,
  catalog: Catalog,
  options: { previous: Registry; rebind: boolean },
): Promise<Enrollment> {
  const context = enrollmentContext(client, catalog, options);

  for (const fileId of new Set(catalog.nodes.map((node) => node.fileId)))
    await client.call('get_basic_info', { fileId });

  for (const master of catalog.masters) await tryFamily(context, master);
  repairMissing(context);

  return context.result;
}

async function readFamily(
  context: EnrollmentContext,
  master: LocatedNode,
): Promise<void> {
  const source = await context.reader.read(master.fileId, master.id);
  rejectAmbiguous(source, context.result.registry);
  const family = await enrollCopies(context, master, source);
  context.result.registry.families.push(family);
  console.log(`${master.name}: ${family.copies.length} copies`);
}

function emptyEnrollment(): Enrollment {
  return {
    registry: { version: 1, families: [] },
    excluded: [],
    rebindings: [],
  };
}
