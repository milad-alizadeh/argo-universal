import { agentCatalogSyncRequest } from '@repo/db/schema';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, expect, it } from 'vitest';
import {
  createCatalogSupervisorModel,
  serializeCatalogSupervisorState,
  serializeCatalogSupervisorEvent,
} from '#mocks/catalog-supervisor-model';
import { openTestDatabase } from '#mocks/database';

const modeled = openTestDatabase();
modeled.database
  .insert(agentCatalogSyncRequest)
  .values({
    requestId: 'unfinished',
    syncId: 'unfinished',
    status: 'pending',
    requestedAt: 1,
  })
  .run();
afterAll(modeled.remove);
const model = createCatalogSupervisorModel(modeled.database);

it('structurally walks every sync supervisor transition including SQL failure and shutdown branches', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths: model.paths,
      stateKey: serializeCatalogSupervisorState,
      eventKey: serializeCatalogSupervisorEvent,
    }),
  ).toEqual([]);
});
