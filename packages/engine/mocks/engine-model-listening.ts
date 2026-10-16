import { expect } from 'vitest';
import type { HttpServerOptions } from '../src/engine/http-server';
import { input } from './engine-model-fixtures';
import type { EngineSnapshot } from './engine-model-logic';
import * as model from './engine-model-state';

export function expectListeningOptions(
  installations: EngineSnapshot['context']['installations'],
): void {
  expect(model.startHttpServerCalls).toEqual([
    expect.objectContaining({
      input: listeningInput(installations),
    }),
  ]);
}

function listeningInput(
  installations: EngineSnapshot['context']['installations'],
): HttpServerOptions {
  return {
    ...listenerIdentity,
    installations,

    database: model.mockDatabase,
    sessions: expect.anything(),
    databaseWriter: expect.anything(),
    syncSupervisor: expect.anything(),
    registry: expect.anything(),
    commandAdmission: expect.any(AbortController),
    ...defaultAgentOptions,
  };
}

const listenerIdentity = {
  createId: input.createId,
  home: input.home,
  port: 7337,
  version: '1.2.3',
  startedAt: input.startedAt,
};

const defaultAgentOptions = {
  acp: undefined,
  loginTimeoutMs: undefined,
  loginCleanupTimeoutMs: undefined,
};
