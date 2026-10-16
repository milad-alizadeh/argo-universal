import type { Bounds } from '../model';
import type { Folder } from './treemap-folder';

interface Partition {
  nodes: Folder[];
  bounds: Bounds;
}

const halves = 2;

function splitIndex(nodes: Folder[], total: number): number {
  let weight = 0;

  const middle = nodes.findIndex((node) => {
    weight += node.weight;

    return weight >= total / halves;
  });

  return Math.min(nodes.length - 1, Math.max(1, middle + 1));
}

function horizontal(bounds: Bounds, ratio: number): Bounds[] {
  return [
    { ...bounds, w: bounds.w * ratio },
    { ...bounds, x: bounds.x + bounds.w * ratio, w: bounds.w * (1 - ratio) },
  ];
}

function vertical(bounds: Bounds, ratio: number): Bounds[] {
  return [
    { ...bounds, h: bounds.h * ratio },
    { ...bounds, y: bounds.y + bounds.h * ratio, h: bounds.h * (1 - ratio) },
  ];
}

export function partition(nodes: Folder[], bounds: Bounds): Partition[] {
  const total = nodes.reduce((sum, node) => sum + node.weight, 0);
  const index = splitIndex(nodes, total);
  const left = nodes.slice(0, index);
  const ratio = left.reduce((sum, node) => sum + node.weight, 0) / total;

  const parts =
    bounds.w >= bounds.h ? horizontal(bounds, ratio) : vertical(bounds, ratio);

  return parts.map((part, side) => ({
    bounds: part,
    nodes: side === 0 ? left : nodes.slice(index),
  }));
}
