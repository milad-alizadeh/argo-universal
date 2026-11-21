import { lstat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { startSessionCreation } from './creation/session-creation';
import { sessionOrigin, userOrigin } from './prompt-sender';
import { requireWritableSession } from './session-command';
import { startPromptOn } from './session-prompt';
import type { HandlerSources } from './session-sources';
import type { TurnHappening } from './turn-happenings';

type GenerationSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready'
>;

type HandoffSources = GenerationSources &
  Parameters<typeof startSessionCreation>[0] &
  HandlerSources<'findFeed', 'queued'>;

type HandoffTurnEnd = Extract<TurnHappening, { type: 'turn.ended' }>;

export async function handoffSession(
  sources: HandoffSources,
  sessionId: string,
): Promise<{ sessionId: string }> {
  const source = requireWritableSession(sources.open.queued(sessionId));

  try {
    const path = await generateHandoff(sources, sessionId);

    const creation = await startSessionCreation(
      sources,
      {
        agent: source.agent,
        projectId: source.projectId,
        checkout: { type: 'starter' },
        configOptions: [],
        prompt: [
          {
            type: 'text',
            text: `Read the handoff document at ${JSON.stringify(path)} and continue the work it describes.`,
          },
        ],
      },
      sessionOrigin(sessionId, source.title),
    );

    const started = await creation.accepted;

    if (!started.turnId)
      throw handoffFailed('The new Session did not accept its initial Prompt.');

    return { sessionId: started.sessionId };
  } catch (cause) {
    sources.findFeed(sessionId)?.send({
      type: 'feed.change',
      turnId: null,
      change: {
        type: 'upsert',
        update: {
          id: sources.createId(),
          sessionUpdate: 'notice',
          state: 'settled',
          severity: 'warning',
          title: 'Handoff failed',
          description: 'The handoff could not be completed.',
        },
      },
    });
    throw cause;
  }
}

async function generateHandoff(
  sources: GenerationSources,
  sessionId: string,
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'session-handoff-'));
  const path = join(directory, 'handoff.md');

  try {
    await runHandoffTurn(sources, sessionId, path);

    const document = await lstat(path).catch(() => null);

    if (!document?.isFile() || document.size === 0)
      throw handoffFailed('The Agent did not write a handoff document.');

    return path;
  } catch (cause) {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
    throw cause;
  }
}

async function runHandoffTurn(
  sources: GenerationSources,
  sessionId: string,
  path: string,
): Promise<void> {
  const actor = await sources.open.ready(sessionId, 'session.prompt');
  const turnId = sources.createId();
  let ending: HandoffTurnEnd | undefined;

  const subscription = actor.on('turn.ended', (event) => {
    if (event.turnId === turnId) ending = event;
  });

  try {
    const result = await startPromptOn(sources, actor, {
      input: {
        sessionId,
        prompt: [
          {
            type: 'text',
            text: [
              '/$handoff',
              `Use the handoff skill to write the document to ${JSON.stringify(path)}.`,
              'Summarize the current conversation for a fresh Agent and include a suggested skills section.',
              'Reference existing artifacts by path or URL and redact secrets and personal information.',
              'Report a failure in this Session if you cannot write the document.',
            ].join('\n'),
          },
        ],
        followUpSuggestions: false,
      },
      turn: { id: turnId, sender: userOrigin.sender },
    });

    if (result.status === 'dropped')
      throw handoffFailed('The Prompt was dropped.');

    await waitFor(actor, () => ending !== undefined, { timeout: Infinity });

    if (ending?.stopReason !== 'end_turn' || ending.error)
      throw handoffFailed('The Agent did not finish the Handoff Turn.');
  } finally {
    subscription.unsubscribe();
  }
}

const handoffFailed = (message: string): TRPCError =>
  new TRPCError({ code: 'PRECONDITION_FAILED', message });
