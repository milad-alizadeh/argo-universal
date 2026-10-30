import { z } from 'zod';
import { feedRowColumns } from '../columns';
import { ContentBlock } from './content-block';
import { createFeedMetadataSchema } from './metadata';
import type { SessionUpdateKind } from './session-update';

// Fields every Feed row carries, from the `feed_row` table (ADR-0007).
export const envelope = feedRowColumns.pick({
  id: true,
  sessionId: true,
  position: true,
  revision: true,
  turnId: true,
  state: true,
}).shape;

// One value of the `sessionUpdate` column, so a kind the table does not list fails `tsc`.
export const kind = <Kind extends SessionUpdateKind>(
  value: Kind,
): z.ZodEnum<{ [Key in Kind]: Key }> =>
  feedRowColumns.shape.sessionUpdate.extract([value]);

// `_meta` is ACP's extension slot; Argo's own fields live under `_meta.argo` (ADR-0006).
export const noExtensionMeta = createFeedMetadataSchema(z.strictObject({}));

export const message = {
  messageId: z.string(),
  content: z.array(ContentBlock),
  _meta: noExtensionMeta,
};
