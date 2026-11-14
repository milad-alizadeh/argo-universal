import { z } from 'zod';

// The roles a Session declares for the Agents it spawns, each drawn with its own mark (#2075).
export const SubagentRole = z.enum([
  'explore',
  'general',
  'plan',
  'review',
  'test',
]);

export type SubagentRole = z.infer<typeof SubagentRole>;
