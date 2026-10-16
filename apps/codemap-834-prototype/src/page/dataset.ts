import type { CodeMapFile } from '../code-map';
import dataset from '../dataset.json';

/** A snapshot file; `branches` is the measure its tone came from. */
export interface FileEntry extends CodeMapFile {
  height: number;
  branches: number;
}

export const source = dataset;

function replica(index: number): FileEntry {
  const file = dataset.files.at(index % dataset.files.length);

  if (!file) throw new Error('The CodeMap snapshot must contain files');
  const copy = Math.floor(index / dataset.files.length);

  if (!copy) return file;

  return {
    ...file,
    id: `stress-${copy}/${file.id}`,
    path: `stress-${copy}/${file.path}`,
  };
}

export function getFiles(count: number): FileEntry[] {
  if (!count) return dataset.files;

  return Array.from({ length: count }, (_, index) => replica(index));
}
