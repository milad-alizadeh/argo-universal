import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import { type DeclaredSlot, declaredSlots } from '#plugin-slot-registry';

type AnyDeclaredSlot = DeclaredSlot<string, z.ZodObject>;

type DeclaredEntries = readonly AnyDeclaredSlot[];

type Ids<Entries extends DeclaredEntries> = Entries[number]['id'];

type ItemOf<Entry extends AnyDeclaredSlot> = Entry['content']['item'];

// What one Plugin lists for each declared Slot in `contributes.declared`, keyed by Slot id.
type ContributionShape<Entries extends DeclaredEntries> = {
  [Entry in Entries[number] as Entry['id']]: z.ZodOptional<
    z.ZodArray<ItemOf<Entry>>
  >;
};

type Attributed<Item extends z.ZodObject> = z.ZodObject<
  { pluginId: typeof PluginIdentifier; item: Item },
  z.core.$strict
>;

export type DeclaredSchemas<Entries extends DeclaredEntries> = {
  DeclaredSlotId: z.ZodLiteral<Ids<Entries>>;
  // A manifest's `contributes.declared`.
  DeclaredContributions: ReturnType<
    typeof z.strictObject<ContributionShape<Entries>>
  >;
  // What an App asks a declared Slot with: its id alone, since nothing in it depends on where it is drawn.
  DeclaredItemsInput: z.ZodUnion<
    z.ZodObject<{ slotId: z.ZodLiteral<Ids<Entries>> }, z.core.$strict>[]
  >;
  // Every enabled Plugin's items in Slot order, each with its Plugin.
  DeclaredItems: z.ZodUnion<z.ZodArray<Attributed<ItemOf<Entries[number]>>>[]>;
  declaredSlot: (slotId: string) => Entries[number] | undefined;
};

const uniqueIds = (items: readonly { id?: unknown }[]): boolean =>
  new Set(items.map(({ id }) => id)).size === items.length;

// One Plugin's items for one declared Slot: at most its per-Plugin limit, each id once.
const contribution = ({ content }: AnyDeclaredSlot): z.ZodArray<z.ZodObject> =>
  z
    .array(content.item)
    .max(content.limit.perPlugin)
    .refine(uniqueIds, 'Declared item ids must be unique');

// Everything a declared Slot is checked against is read off its entry, so a new entry needs no edit here.
export function declaredSchemas<const Entries extends DeclaredEntries>(
  entries: Entries,
): DeclaredSchemas<Entries> {
  const ids = entries.map(({ id }): Ids<Entries> => id);

  const shape = Object.fromEntries(
    entries.map((entry) => [entry.id, contribution(entry).optional()]),
  );

  return {
    DeclaredSlotId: z.literal(ids),
    // The shape is built from the same entries its type maps, one key per Slot id.
    DeclaredContributions: z.strictObject(shape as ContributionShape<Entries>),
    DeclaredItemsInput: z.union(
      ids.map((id) => z.strictObject({ slotId: z.literal(id) })),
    ),
    DeclaredItems: z.union(
      entries.map(({ content }) =>
        z.array(
          z.strictObject({ pluginId: PluginIdentifier, item: content.item }),
        ),
      ),
    ),
    declaredSlot: (slotId) => entries.find(({ id }) => id === slotId),
  };
}

export const {
  DeclaredSlotId,
  DeclaredContributions,
  DeclaredItemsInput,
  DeclaredItems,
  declaredSlot,
} = declaredSchemas(declaredSlots);

export type DeclaredSlotId = z.infer<typeof DeclaredSlotId>;

export type DeclaredItemsInput = z.infer<typeof DeclaredItemsInput>;

export type DeclaredItems = z.infer<typeof DeclaredItems>;
