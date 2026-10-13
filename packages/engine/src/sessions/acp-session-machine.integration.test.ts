import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  acpModelEventKey,
  createAcpSessionModel,
  type AcpModelSnapshot,
} from '#mocks/acp-session-model';
import type { AcpSessionLease } from '../agents';
import { findMachineActor } from '../lib/machine-actor';
import { sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

const feedFlushDelayEvent =
  'xstate.after.feedFlushLimit.session.open.acp.flushing';
const expectAcpState = (
  snapshot: AcpModelSnapshot,
  lease: AcpSessionLease,
): void => {
  if (
    snapshot.matches({ open: { acp: 'idle' } }) ||
    snapshot.matches({ open: { acp: 'opening' } })
  )
    expect(snapshot.context.activeTurnId).toBeNull();
  if (snapshot.matches({ open: { acp: 'idle' } })) {
    expect(snapshot.context.acpLease).toBe(lease);
    expect(snapshot.context.vendorSessionId).toBe(lease.sessionId);
    expect(snapshot.context.stored).toBe(true);
  }
  if (snapshot.matches({ open: { acp: 'retainingCleanup' } }))
    expect(
      snapshot.context.failure !== null ||
        snapshot.context.agentCrashes.length > 0,
    ).toBe(true);
};

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it.each(['new', 'existing', 'opened'] as const)(
    'the ACP structural graph from %s walks every creation, opening, recovery and cleanup transition',
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
      const { model, paths, lease } = createAcpSessionModel(
        actor.getSnapshot(),
        entry,
      );
      for (const path of paths)
        for (const step of path.steps) {
          expectAcpState(step.state, lease);
          if (step.event.type === 'session.storageFailing') {
            expect(
              step.state.matches({
                open: { acp: { activeTurn: 'cancelling' } },
              }),
            ).toBe(true);
            expect(step.state.context.storageFailedTurn).toBe(true);
          }
          if (
            step.event.type === 'xstate.after.checkoutLimit.session.creating'
          ) {
            expect(step.state.status).toBe('done');
            expect(step.state.output).toEqual({
              failure:
                'Checkout creation exceeded checkoutLimit (10000 ms). Retry the Session.',
            });
          }
          if (step.event.type === feedFlushDelayEvent)
            expect(step.state.context.failure).not.toBeNull();
        }
      expect(
        unwalkedTransitions({
          models: [model],
          paths,
          stateKey: (snapshot) => JSON.stringify(snapshot.value),
          eventKey: acpModelEventKey,
        }),
      ).toEqual([]);
      expect(paths.length).toBeGreaterThan(0);
      await host.caller.session.close(created);
    },
    15_000,
  );
});
