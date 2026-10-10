import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { feedRowBudget, type WriterInput } from '../src/services/feed';

// What every Writer needs besides its database: a Blob folder tests never read, and the Engine's Feed row budget.
export const writerDefaults: Pick<
  WriterInput,
  'blobsFolder' | 'feedRowBudget'
> = {
  blobsFolder: join(tmpdir(), 'argo-test-blobs'),
  feedRowBudget,
};
