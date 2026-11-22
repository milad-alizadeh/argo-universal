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

const longest = 60;

/*
 * What the editor's header says a node is: its region and the Variant it is drawn in, else the first line of text it
 * shows, cut short. A node that shows no text outside a region has no header.
 */
export function titleOf({
  place,
  text,
}: {
  place: { label: string; variant: string } | null;
  text: string;
}): string | null {
  if (place) return `${place.label} · ${place.variant}`;

  const line = text.trim();

  if (line === '') return null;

  return line.length > longest ? `${line.slice(0, longest).trimEnd()}…` : line;
}

// What a screen reader hears for the editor: the node's key and region, which the header leaves out.
export function keyOf({
  nodeKey,
  place,
}: {
  nodeKey: string;
  place: { label: string; letter: string } | null;
}): string {
  return place ? `${place.label} · ${place.letter} · ${nodeKey}` : nodeKey;
}
