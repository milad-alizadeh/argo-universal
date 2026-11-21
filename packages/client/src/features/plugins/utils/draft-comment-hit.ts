export type Placed = {
  address: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const contains = (box: Placed, { x, y }: { x: number; y: number }): boolean =>
  x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

/*
 * The node a press picks: of the boxes the point is in, the smallest, since a node sits inside the node that holds
 * it. The later of two equal boxes sits over the earlier. A point outside every node picks none.
 */
export function innermostAt(
  boxes: readonly Placed[],
  point: { x: number; y: number },
): Placed | null {
  return boxes.reduce<Placed | null>((best, box) => {
    if (!contains(box, point)) return best;

    const smaller = !best || box.width * box.height <= best.width * best.height;

    return smaller ? box : best;
  }, null);
}

export function titleOf({
  nodeKey,
  place,
}: {
  nodeKey: string;
  place: { label: string; letter: string } | null;
}): string {
  return place ? `${place.label} · ${place.letter} · ${nodeKey}` : nodeKey;
}
