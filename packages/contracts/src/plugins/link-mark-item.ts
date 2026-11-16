import { z } from 'zod';

const linkUrlLimit = 4096;

// A link is asked about with the Project it is drawn in, whose Account a Plugin reads it with (ADR-0052).
export const LinkMarkContext = z.strictObject({
  href: z.string().min(1).max(linkUrlLimit),
  projectId: z.string().min(1),
});

// The state of the pull request or Issue a link points at. Argo draws the mark for it beside the link.
export const LinkMarkItem = z.strictObject({
  kind: z.enum(['pullRequest', 'issue']),
  state: z.enum(['open', 'closed', 'merged', 'draft']),
});

export type LinkMarkItem = z.infer<typeof LinkMarkItem>;
