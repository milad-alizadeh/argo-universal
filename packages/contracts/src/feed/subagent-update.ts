import { z } from 'zod';
import { ContentBlock } from './content-block';
import { createFeedMetadataSchema } from './metadata';
import { SubagentRole } from './subagent-role';
import { envelope, kind } from './update-fields';

export const SubagentState = z.enum(['running', 'idle', 'requires_action']);

export type SubagentState = z.infer<typeof SubagentState>;

// ACP has no `wait` or `close`, so neither is an action (#930).
export const SubagentAction = z.enum(['spawn', 'message']);

export type SubagentAction = z.infer<typeof SubagentAction>;

// ACP's `sessionId` and `state` clash with the envelope's, so both carry a `subagent` prefix.
export const SubagentUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('subagent_update'),
  subagentSessionId: z.string(),
  title: z.string().optional(),
  subagentState: SubagentState.optional(),
  /*
   * `prompt` is the parent's outgoing message; `result` only an explicit reply from the child.
   * `childPosition` is the child Feed's next position when the result first arrived, where the child's Feed draws it (#1981).
   */
  _meta: createFeedMetadataSchema(
    z.strictObject({
      action: SubagentAction.optional(),
      role: z.string().optional(),
      // The role the Session declared before the spawn; it outranks any role the Agent reports.
      declaredRole: SubagentRole.optional(),
      prompt: z.array(ContentBlock).optional(),
      result: z.array(ContentBlock).optional(),
      childPosition: z.number().int().nonnegative().optional(),
    }),
  ),
});

export type SubagentUpdate = z.infer<typeof SubagentUpdate>;
