import type { CodeFile } from '../model';

// A folder or file in the path tree, weighed by the lines beneath it.
export interface Folder {
  weight: number;
  children: Map<string, Folder>;
  file?: CodeFile;
}

function childFolder(parent: Folder, name: string): Folder {
  const existing = parent.children.get(name);

  if (existing) return existing;
  const child: Folder = { weight: 0, children: new Map() };
  parent.children.set(name, child);

  return child;
}

function insertFile(root: Folder, file: CodeFile): void {
  let node = root;
  node.weight += file.lines;

  for (const name of file.path.split('/')) {
    node = childFolder(node, name);
    node.weight += file.lines;
  }

  node.file = file;
}

export function folders(files: CodeFile[]): Folder[] {
  const root: Folder = { weight: 0, children: new Map() };

  for (const file of files) insertFile(root, file);

  return [...root.children.values()];
}
