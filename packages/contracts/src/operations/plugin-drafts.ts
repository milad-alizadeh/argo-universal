import { z } from 'zod';
import { pluginDraftColumns } from '../columns';
import { PluginIdentifier } from '../plugins/plugin-identifier';

// The Variant the author picked for one region of a Draft page; one per region, so parts of several Variants mix.
export const DraftPick = z.strictObject({
  region: z.string().min(1),
  variant: z.string().min(1),
});

export type DraftPick = z.infer<typeof DraftPick>;

// A note on one node of the Draft, naming the node by its key and the region and Variant it sits in, when it sits in one.
export const DraftComment = z.strictObject({
  nodeKey: z.string().min(1),
  region: z.string().min(1).optional(),
  variant: z.string().min(1).optional(),
  note: z.string().trim().min(1),
});

export type DraftComment = z.infer<typeof DraftComment>;

const distinctRegions = (picks: readonly DraftPick[]): boolean =>
  new Set(picks.map(({ region }) => region)).size === picks.length;

// Input of `plugin.draft.choose`: the author's pick and comments for a Plugin's Draft.
export const DraftChooseInput = z.strictObject({
  pluginId: PluginIdentifier,
  picks: z
    .array(DraftPick)
    .refine(distinctRegions, { message: 'A region is picked once' }),
  comments: z.array(DraftComment).default([]),
});

// The Session whose Agent got the pick, and whether it began a Turn or joined the Session's queue.
export const DraftChooseOutput = z.strictObject({
  sessionId: pluginDraftColumns.shape.sessionId.unwrap(),
  delivery: z.enum(['started', 'queued']),
});

export const DraftPickInput = z.strictObject({ pluginId: PluginIdentifier });

// What was last chosen for a Plugin's Draft, or null while nothing has been.
export const DraftPickOutput = z.strictObject({
  choice: z
    .strictObject({
      sessionId: pluginDraftColumns.shape.sessionId.unwrap(),
      picks: z.array(DraftPick),
      comments: z.array(DraftComment),
      chosenAt: z.number(),
    })
    .nullable(),
});

export type DraftChoice = NonNullable<
  z.infer<typeof DraftPickOutput>['choice']
>;
