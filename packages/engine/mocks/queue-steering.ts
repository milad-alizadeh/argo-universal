import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { QueuedPrompt } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { findMachineActor } from '../src/lib/machine-actor';
import {
  sessionActorId,
  sessionMachine,
  type SessionActorRef,
} from '../src/sessions';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSnapshot } from './acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

interface SteeringControl {
  received: PromiseWithResolvers<unknown>;
  result: PromiseWithResolvers<unknown>;
  turnEnded: PromiseWithResolvers<void>;
  prompts: PromptRequest[];
}

interface SteeringFixture extends Host, SteeringControl {
  sessionId: string;
  actor: SessionActorRef;
  queue: (text: string) => Promise<Record<string, never>>;
}

function controls(): SteeringControl {
  return {
    received: Promise.withResolvers<unknown>(),
    result: Promise.withResolvers<unknown>(),
    turnEnded: Promise.withResolvers<void>(),
    prompts: [],
  };
}

function scenario(control: SteeringControl): ScriptedScenario {
  return {
    steps: [{ type: 'wait-for-cancel', until: control.turnEnded.promise }],
    initialize: {
      protocolVersion: 1,
      agentInfo: { name: '@agentclientprotocol/codex-acp', version: '2.4.0' },
      _meta: { steering: { supported: true } },
    },
    steering: { received: control.received, result: control.result.promise },
    responses: { 'session/prompt': [{ requests: control.prompts }] },
  };
}

export async function startSteeringFixture(): Promise<SteeringFixture> {
  const control = controls();
  const host = await startAcpEngine(scenario(control));

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Original Turn' }],
  });

  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.canSteer === true,
  );

  return queuedFixture(host, created.sessionId, control);
}

async function queuedFixture(
  host: Host,
  sessionId: string,
  control: SteeringControl,
): Promise<SteeringFixture> {
  const actor = steeringActor(host, sessionId);

  const queue = (text: string): Promise<Record<string, never>> =>
    host.caller.session.queue({
      sessionId,
      command: { action: 'append', prompt: [{ type: 'text', text }] },
    });

  await queue('Steer this');
  await queue('Keep queued');

  return { ...host, ...control, sessionId, actor, queue };
}

export function firstQueued(fixture: SteeringFixture): QueuedPrompt {
  const row = fixture.actor.getSnapshot().context.promptQueue.items[0];

  if (!row) throw new Error('Expected a queued Prompt');

  return row;
}

function steeringActor(host: Host, sessionId: string): SessionActorRef {
  const actor = findMachineActor(
    host.engine.system,
    sessionActorId(sessionId),
    sessionMachine,
  );

  if (!actor) throw new Error('The steering Session is missing');

  return actor;
}
