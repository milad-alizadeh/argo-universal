import { z } from 'zod';

export const Pull = z.object({
  repository: z.string(),
  number: z.number(),
  title: z.string(),
  branch: z.string(),
  head: z.string(),
  base: z.string(),
  additions: z.number(),
  deletions: z.number(),
  files: z.array(
    z.object({
      filename: z.string(),
      status: z.enum(['added', 'removed', 'modified', 'renamed']),
      additions: z.number(),
      deletions: z.number(),
      patch: z.string().optional(),
    }),
  ),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed']),
      conclusion: z.string().nullable(),
    }),
  ),
});

export type Pull = z.infer<typeof Pull>;

// What the fixture GitHub knows: pull requests with their files and Checks.
export const Fixture = z.object({ pulls: z.array(Pull) });
