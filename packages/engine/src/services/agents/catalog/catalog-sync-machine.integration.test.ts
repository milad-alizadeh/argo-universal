import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, expect, it } from 'vitest';
import {
  createCatalogSyncModel,
  serializeCatalogSyncState,
} from '#mocks/catalog-sync-model';
import { openTestDatabase } from '#mocks/database';

const modeledDatabase = openTestDatabase();
afterAll(modeledDatabase.remove);
const model = createCatalogSyncModel(modeledDatabase.database);

it('structurally walks every finite sync transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths: model.paths,
      stateKey: serializeCatalogSyncState,
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
});
