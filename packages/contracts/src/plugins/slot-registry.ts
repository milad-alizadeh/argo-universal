import { z } from 'zod';
import type { wireParts } from './wire-parts';

// A Slot id is versioned, so a later context shape gets a new id instead of breaking Plugins (Grafana's extension points).
export const projectDetailsSlotId = 'argo/project/details/v1';

export const sessionRowSlotId = 'argo/session/row/v1';

export const toolCallSlotId = 'argo/feed/tool-call/v1';

export const messageSlotId = 'argo/feed/message/v1';

type WireParts = typeof wireParts;

// What a Slot takes: any kit tree, or only the parts one kit component's slot accepts.
export type SlotContentRule =
  | 'tree'
  | {
      [Part in keyof WireParts]: {
        part: Part;
        slot: keyof WireParts[Part]['slots'] & string;
      };
    }[keyof WireParts];

export type AddOnlySlot<Id extends string, Context extends z.ZodObject> = {
  id: Id;
  kind: 'add-only';
  content: SlotContentRule;
  input: z.ZodObject<
    { slotId: z.ZodLiteral<Id>; context: Context },
    z.core.$strict
  >;
};

export type ReplaceableSlot<Id extends string> = {
  id: Id;
  kind: 'replaceable';
};

export function addOnly<Id extends string, Context extends z.ZodObject>(
  id: Id,
  context: Context,
  content: SlotContentRule,
): AddOnlySlot<Id, Context> {
  return {
    id,
    kind: 'add-only',
    content,
    input: z.strictObject({ slotId: z.literal(id), context }),
  };
}

const replaceable = <Id extends string>(id: Id): ReplaceableSlot<Id> => ({
  id,
  kind: 'replaceable',
});

// Every Slot is one entry: adding an entry is the whole job of adding a Slot.
export const addOnlySlots = [
  addOnly(
    projectDetailsSlotId,
    z.strictObject({ projectId: z.string().min(1) }),
    'tree',
  ),
  addOnly(
    sessionRowSlotId,
    z.strictObject({
      sessionId: z.string().min(1),
      projectId: z.string().min(1),
      branch: z.string().nullable(),
    }),
    { part: 'ListItem', slot: 'meta' },
  ),
] as const;

// Replaceable Slots carry props, not a context; Plugins reach them through `ui.render` (ADR-0027).
export const replaceableSlots = [
  replaceable(toolCallSlotId),
  replaceable(messageSlotId),
] as const;
