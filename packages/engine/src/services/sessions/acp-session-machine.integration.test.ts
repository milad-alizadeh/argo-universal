import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  createAcpSessionModel,
  type AcpModelSnapshot,
} from '#mocks/acp-session-model';
import type { AcpSessionLease } from '../agents';
import { findSessionActor } from './index';

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
    expect(snapshot.context.failure).not.toBeNull();
};

it('the public ACP Session model walks every opening, closing and retained-cleanup transition', async () => {
  const host = await startAcpEngine();
  const created = await host.caller.session.new(emptySessionInput);
  const actor = findSessionActor(host.engine.system, created.sessionId);
  if (!actor) throw new Error('The public Session actor is missing');
  const { model, paths, lease } = createAcpSessionModel(actor.getSnapshot());
  for (const path of paths)
    for (const step of path.steps) expectAcpState(step.state, lease);
  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey: (snapshot) => JSON.stringify(snapshot.value),
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
  expect(paths.length).toBeGreaterThan(0);
  await host.caller.session.close(created);
});
