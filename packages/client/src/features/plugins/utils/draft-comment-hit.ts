// A node's box in the window, by its address in the tree.
export type Box = {
  address: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const contains = (box: Box, { x, y }: { x: number; y: number }): boolean =>
  x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

/*
 * The node a press picks: of the boxes the point is in, the smallest, since a node sits inside the node that holds
 * it. The later of two equal boxes sits over the earlier. A point outside every node picks none.
 */
export function innermostAt(
  boxes: readonly Box[],
  point: { x: number; y: number },
): Box | null {
  return boxes.reduce<Box | null>((best, box) => {
    if (!contains(box, point)) return best;

    const smaller = !best || box.width * box.height <= best.width * best.height;

    return smaller ? box : best;
  }, null);
}

/*
 * What the editor calls the node it is on: the region, its Variant's letter and the node's key, as the region's tag
 * reads, or the key alone for a node outside every region.
 */
export function titleOf({
  nodeKey,
  place,
}: {
  nodeKey: string;
  place: { label: string; letter: string } | null;
}): string {
  return place ? `${place.label} · ${place.letter} · ${nodeKey}` : nodeKey;
}
