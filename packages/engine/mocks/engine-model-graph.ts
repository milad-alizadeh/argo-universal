import type { ModelGraph, Vertex } from '@repo/vitest/model-test';
import { type EngineEvent, fixtures } from './engine-model-events';
import { input } from './engine-model-fixtures';
import { type EngineSnapshot, machine } from './engine-model-logic';

// Never the handles themselves, only whether each is held.
const vertex = (snapshot: EngineSnapshot): Vertex => ({
  value: snapshot.value,
  database: snapshot.context.database !== null,
  server: snapshot.context.server !== null,
  failure: snapshot.context.failure !== null,
});

export const graph: ModelGraph<typeof machine, EngineEvent> = {
  input,
  fixtures,
  vertex,
  limit: 1000,
  walks: [{ name: 'shortest path', search: 'shortest' }],
};
