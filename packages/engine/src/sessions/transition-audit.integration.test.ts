import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import {
  pathWalks,
  unwalkedAutomaticTransitions,
  unwalkedDeclaredTransitions,
} from '@repo/vitest/model-audit';
import { expect, it } from 'vitest';
import { automaticWalks } from '#mocks/acp-auto-witnesses';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createAcpSessionModel } from '#mocks/acp-session-model';
import { extraTransitionWitnesses } from '#mocks/acp-transition-witnesses';
import { findMachineActor } from '../lib/machine-actor';
import { sessionActorId } from './open-sessions-machine';
import { sessionMachine } from './session-machine';

it('walks every declared Session event transition, including guarded branches', async () => {
  const agent = appFixtureAgentIds[0];

  if (!agent) throw new Error('No Agent fixture');

  const host = await startAcpEngine({ steps: [] }, undefined, agent);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    agent,
  });

  const actor = findMachineActor(
    host.engine.system,
    sessionActorId(created.sessionId),
    sessionMachine,
  );

  if (!actor) throw new Error('The Session model actor is missing');

  const paths = (['new', 'existing', 'opened'] as const).flatMap(
    (entry) => createAcpSessionModel(actor.getSnapshot(), entry).paths,
  );

  expect(
    unwalkedAutomaticTransitions(
      sessionMachine,
      automaticWalks(paths, actor.getSnapshot()),
    ),
  ).toEqual([]);
  expect(
    unwalkedDeclaredTransitions(sessionMachine, {
      walks: pathWalks(paths),
      witnesses: extraTransitionWitnesses(paths),
    }),
  ).toEqual([]);
  await host.caller.session.close(created);
}, 15_000);
