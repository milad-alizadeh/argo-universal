import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { subagentSnapshot } from '../../../../mocks/subagent-rows.mocks';
import {
  snapshotKey,
  snapshotKeyPrefix,
  snapshotQueryDefaults,
} from './feed-query';

// A Turn keeps its drawing while the Subagents list is the object it was drawn with, so a snapshot that changes something else must hand back the same list.
it('keeps the Subagents list when a later snapshot does not change it', () => {
  const queryClient = new QueryClient();
  queryClient.setQueryDefaults(snapshotKeyPrefix, snapshotQueryDefaults);
  queryClient.setQueryData(snapshotKey('session'), subagentSnapshot);

  const held = queryClient.getQueryData<typeof subagentSnapshot>(
    snapshotKey('session'),
  );

  queryClient.setQueryData(
    snapshotKey('session'),
    structuredClone({
      ...subagentSnapshot,
      maxRevision: subagentSnapshot.maxRevision + 1,
    }),
  );

  const next = queryClient.getQueryData<typeof subagentSnapshot>(
    snapshotKey('session'),
  );

  expect(next?.maxRevision).toBe(subagentSnapshot.maxRevision + 1);
  expect(subagentSnapshot.subagents.length).toBeGreaterThan(0);
  expect(next?.subagents).toBe(held?.subagents);
});
