import type { CodeMapFile } from '../model';

export interface Folder {
  weight: number;
  children: Map<string, Folder>;
  file?: CodeMapFile;
}

function childFolder(parent: Folder, name: string): Folder {
  const existing = parent.children.get(name);

  if (existing) return existing;
  const child: Folder = { weight: 0, children: new Map() };
  parent.children.set(name, child);

  return child;
}

function insertFile(root: Folder, file: CodeMapFile): void {
  let node = root;
  node.weight += file.area;

  for (const name of file.path.split('/')) {
    node = childFolder(node, name);
    node.weight += file.area;
  }

  node.file = file;
}

export function folders(files: CodeMapFile[]): Folder[] {
  const root: Folder = { weight: 0, children: new Map() };

  for (const file of files) insertFile(root, file);

  return [...root.children.values()];
}
