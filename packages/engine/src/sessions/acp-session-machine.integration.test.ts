import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  checkCreationReceipt,
  checkNativePermission,
  checkModelPaths,
  checkPermissionHook,
} from '#mocks/acp-session-extra-assertions';
import {
  createAcpSessionModel,
  type AcpModelSnapshot,
} from '#mocks/acp-session-model';
import { findMachineActor } from '../lib/machine-actor';
import { sessionActorId } from './open-sessions-machine';
import { checkoutLimit, sessionMachine } from './session-machine';

const pathStates = (
  path: ReturnType<typeof createAcpSessionModel>['paths'][number],
): AcpModelSnapshot[] => path.steps.map((step) => step.state);

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it.each(['new', 'existing', 'opened'] as const)(
    'the ACP structural graph from %s walks every creation, opening, cancellation and cleanup transition',
    async (entry) => {
      const host = await startAcpEngine({ steps: [] }, undefined, agentId);
      const created = await host.caller.session.new(sessionInput);

      const actor = findMachineActor(
        host.engine.system,
        sessionActorId(created.sessionId),
        sessionMachine,
      );

      if (!actor)
        throw new Error('The Session for the structural graph is missing');

      const { paths, unwalked, lease } = createAcpSessionModel(
        actor.getSnapshot(),
        entry,
      );

      checkModelPaths(paths, lease, checkoutLimit);

      expect(unwalked()).toEqual([]);

      const states = paths.flatMap(pathStates);
      checkNativePermission(states);
      checkPermissionHook(states);

      if (entry === 'new') checkCreationReceipt(states);

      expect(states.some((state) => state.matches('archived'))).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
      await host.caller.session.close(created);
    },
    15_000,
  );
});
