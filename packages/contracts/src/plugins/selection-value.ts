import { z } from 'zod';

// Marks the schema-owned choice value; the client supplies its generic string type.
export const selectionValue = z.string().brand<'KitChoiceValue'>();

export type KitChoiceValue = z.output<typeof selectionValue>;
