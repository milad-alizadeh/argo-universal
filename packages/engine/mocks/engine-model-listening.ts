import { expect } from 'vitest';
import type { HttpServerOptions } from '../src/engine/http-server';
import { SessionTokens } from '../src/operations';
import { HookPort } from '../src/plugins';
import { input } from './engine-model-fixtures';
import * as model from './engine-model-state';

export function expectListeningOptions(): void {
  expect(model.startHttpServerCalls).toEqual([
    expect.objectContaining({
      input: listeningInput(),
    }),
  ]);
}

function listeningInput(): HttpServerOptions {
  return {
    ...listenerIdentity,

    database: model.mockDatabase,
    sessions: expect.anything(),
    sessionTokens: expect.any(SessionTokens),
    databaseWriter: expect.anything(),
    registry: expect.anything(),
    commandAdmission: expect.any(AbortController),
    hookPort: expect.any(HookPort),
    ...defaultAgentOptions,
  };
}

const listenerIdentity = {
  createId: input.createId,
  now: input.now,
  home: input.home,
  port: 7337,
  version: '1.2.3',
  startedAt: input.startedAt,
};

const defaultAgentOptions = {
  acp: undefined,
};
