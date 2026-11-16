import { z } from 'zod';
import { pressHandler } from './kit-event-props';

export const sessionRowKitProps = z.object({
  sessionId: z
    .string()
    .min(1)
    .describe(
      'The Session to draw. Argo reads it live, so the row never goes stale; a Plugin sends no title, branch or status.',
    ),
  onPress: pressHandler
    .optional()
    .describe('The action run on activation, in place of opening the Session.'),
});
