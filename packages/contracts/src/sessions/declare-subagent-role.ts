import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SubagentRole } from '../feed/session-update';

// Input of `session.declareSubagentRole`: the role of the next Agent the Session spawns (#2075).
export const SessionDeclareSubagentRoleInput = z.strictObject({
  role: SubagentRole.describe(
    'explore searches or reads code; plan designs an approach; review checks work against a spec or standards; test writes or runs tests; general does anything else.',
  ),
  sessionId: sessionColumns.shape.id
    .optional()
    .describe(
      'The Session that spawns the Agent; the calling Session when left out.',
    ),
});

export type SessionDeclareSubagentRoleInput = z.infer<
  typeof SessionDeclareSubagentRoleInput
>;

export const SessionDeclareSubagentRoleOutput = z.strictObject({});

export type SessionDeclareSubagentRoleOutput = z.infer<
  typeof SessionDeclareSubagentRoleOutput
>;
