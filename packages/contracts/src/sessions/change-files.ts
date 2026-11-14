import { z } from 'zod';
import { SessionChangesOutput } from './changes';

/*
 * One page of the files a PR-backed Change changes, as the Plugin that supplied it reads them from its code host
 * (ADR-0052). It has the shape of a local comparison's page, so the App draws both with one list, and says which
 * repository, base and head the files were read against; the Session's Checkout is never one of them. Its diff is a
 * `SessionDiffOutput`.
 */
export const ChangeFilesPage = SessionChangesOutput.extend({
  comparison: z.strictObject({
    repository: z.string(),
    base: z.string(),
    head: z.string(),
  }),
});

export type ChangeFilesPage = z.infer<typeof ChangeFilesPage>;
