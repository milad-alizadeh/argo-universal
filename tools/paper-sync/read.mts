import type { PaperClient } from './client.mts';
import type { Snapshot } from './model.mts';
import { SnapshotReader } from './snapshot-reader.mts';

export async function readSnapshot(
  client: PaperClient,
  fileId: string,
  rootId: string,
): Promise<Snapshot> {
  return new SnapshotReader(client).read(fileId, rootId);
}
