import { syncJobs } from '@repo/db/schema';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, expect, it } from 'vitest';
import {
  createCatalogSupervisorModel,
  serializeCatalogSupervisorState,
  serializeCatalogSupervisorEvent,
} from '#mocks/catalog-supervisor-model';
import { openTestDatabase } from '#mocks/database';

const idle = openTestDatabase();
const interrupted = openTestDatabase();
interrupted.database
  .insert(syncJobs)
  .values({
    source: 'agent-catalog',
    scope: 'default',
    status: 'running',
    requestedAt: 1,
  })
  .run();
afterAll((): void => {
  idle.remove();
  interrupted.remove();
});
const models = [idle, interrupted].map(({ database }) =>
  createCatalogSupervisorModel(database),
);

it('structurally walks every sync supervisor transition including retry, SQL failure and shutdown branches', (): void => {
  expect(
    unwalkedTransitions({
      models,
      paths: models.flatMap(({ paths }) => paths),
      stateKey: serializeCatalogSupervisorState,
      eventKey: serializeCatalogSupervisorEvent,
    }),
  ).toEqual([]);
});
