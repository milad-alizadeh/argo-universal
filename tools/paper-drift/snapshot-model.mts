import { z } from 'zod';

// A component board holds masters; every other artboard holds screens built from copies.
const boardKindSchema = z.enum(['components', 'screens']);
export type BoardKind = z.infer<typeof boardKindSchema>;

const artboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  page: z.string(),
  kind: boardKindSchema,
});
export type Artboard = z.infer<typeof artboardSchema>;

const layerSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  hidden: z.boolean(),
  text: z.string().optional(),
  parent: z.string().nullable(),
  artboard: z.string(),
  children: z.array(z.string()),
});
export type Layer = z.infer<typeof layerSchema>;

export const stylesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);
export type Styles = z.infer<typeof stylesSchema>;

export const snapshotSchema = z.object({
  fileId: z.string(),
  takenAt: z.string(),
  artboards: z.array(artboardSchema),
  layers: z.record(z.string(), layerSchema),
  styles: z.record(z.string(), stylesSchema),
  tokens: z.record(z.string(), z.string()),
  // Keyed by a style unit's root layer; lets the next snapshot reuse the unit's styles. Older snapshots have none.
  fingerprints: z.record(z.string(), z.string()).optional(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

export function boardKind(artboardName: string): BoardKind {
  return artboardName.includes('Components') ? 'components' : 'screens';
}

// A layer's name, or '' when the id is not in the snapshot.
export function nameOf(snapshot: Snapshot, id: string): string {
  return snapshot.layers[id]?.name ?? '';
}

export function layerAt(snapshot: Snapshot, id: string): Layer {
  const layer = snapshot.layers[id];
  if (!layer) throw new Error(`The snapshot has no layer ${id}.`);
  return layer;
}

export function stylesOf(snapshot: Snapshot, id: string): Styles {
  return snapshot.styles[id] ?? {};
}

export function layerPath(snapshot: Snapshot, layer: Layer): string {
  const names: string[] = [];
  for (
    let at: Layer | undefined = layer;
    at;
    at = at.parent ? snapshot.layers[at.parent] : undefined
  )
    names.unshift(at.name);
  return names.join(' › ');
}
