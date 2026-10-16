import dataset from './dataset.json';

export interface FileEntry {
  id: string;
  path: string;
  area: number;
  height: number;
  branches: number;
  tone: string;
}
export interface Tile extends FileEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  elevation: number;
}
export const source = dataset;
export function getFiles(count: number): FileEntry[] {
  if (!count) return dataset.files;
  return Array.from({ length: count }, (_, i) => {
    const file = dataset.files[i % dataset.files.length]!;
    const copy = Math.floor(i / dataset.files.length);
    return copy
      ? {
          ...file,
          id: `stress-${copy}/${file.id}`,
          path: `stress-${copy}/${file.path}`,
        }
      : file;
  });
}
interface Folder {
  name: string;
  weight: number;
  children: Map<string, Folder>;
  file?: FileEntry;
}
// Binary treemap: group by path first, then split cumulative area near half along the longest edge.
export function layout(files: FileEntry[]): Tile[] {
  const root: Folder = { name: '', weight: 0, children: new Map() };
  for (const file of files) {
    let node = root;
    node.weight += file.area;
    for (const name of file.path.split('/')) {
      let child = node.children.get(name);
      if (!child) {
        child = { name, weight: 0, children: new Map() };
        node.children.set(name, child);
      }
      child.weight += file.area;
      node = child;
    }
    node.file = file;
  }
  const tiles: Tile[] = [];
  function split(
    nodes: Folder[],
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    if (!nodes.length) return;
    if (nodes.length === 1) {
      const node = nodes[0]!;
      const gap = Math.min(0.13, w / 10, h / 10);
      const inset = Math.min(0.16, w / 8, h / 8);
      if (node.file)
        tiles.push({
          ...node.file,
          x,
          y,
          w: w - gap,
          h: h - gap,
          elevation: 0.2 + Math.sqrt(node.file.height) * 0.7,
        });
      else
        split(
          [...node.children.values()].sort((a, b) => b.weight - a.weight),
          x + inset,
          y + inset,
          w - inset * 2,
          h - inset * 2,
        );
      return;
    }
    const total = nodes.reduce((sum, n) => sum + n.weight, 0);
    let index = 1,
      sum = nodes[0]!.weight;
    while (index < nodes.length - 1 && sum < total / 2)
      sum += nodes[index++]!.weight;
    const ratio = sum / total;
    if (w >= h) {
      split(nodes.slice(0, index), x, y, w * ratio, h);
      split(nodes.slice(index), x + w * ratio, y, w * (1 - ratio), h);
    } else {
      split(nodes.slice(0, index), x, y, w, h * ratio);
      split(nodes.slice(index), x, y + h * ratio, w, h * (1 - ratio));
    }
  }
  split([...root.children.values()], -50, -40, 100, 80);
  return tiles;
}
export interface Palette {
  light: string;
  card: string;
  foreground: string;
  border: string;
  mutedForeground: string;
  danger: string;
  muted: string;
}
export interface MapProps {
  tiles: Tile[];
  palette: Palette;
  selected?: string;
  onSelect: (id: string) => void;
  command: { action: string; key: number };
  onLabels: (labels: Label[]) => void;
  onReady: (info: Record<string, unknown>) => void;
}
export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
}
export function cullLabels(
  candidates: Label[],
  width: number,
  height: number,
): Label[] {
  const result: Label[] = [];
  for (const label of candidates) {
    const labelWidth = Math.min(200, label.text.length * 7 + 16);
    if (
      label.x < 0 ||
      label.y < 55 ||
      label.x + labelWidth > width ||
      label.y > height - 170
    )
      continue;
    if (
      result.some(
        (other) =>
          Math.abs(other.y - label.y) < 24 && Math.abs(other.x - label.x) < 210,
      )
    )
      continue;
    result.push(label);
    if (result.length === 32) break;
  }
  return result;
}
