import type {
  NewSessionRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate, SlashCommand } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const reviewDescription = 'Review changes';

async function nextUpdate(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  const update = await stream.next();

  if (update.done)
    throw new Error('Options reader ended before Session resumed');

  return update.value;
}

function markReady(
  update: AgentOptionsUpdate,
  ready: PromiseWithResolvers<void>,
): void {
  if (update.stage === 'ready') ready.resolve();
}

it.each(['ready', 'discovering'])(
  'keeps the same options reader live when a closed Session resumes while %s',
  async (stage) => {
    const resumed = Promise.withResolvers<ResumeSessionRequest>();
    const discovering = Promise.withResolvers<NewSessionRequest>();
    const release = Promise.withResolvers<void>();
    const ready = Promise.withResolvers<void>();

    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/new': [
          { result: { sessionId: 'actual' } },
          {
            received: discovering,
            waitFor: release.promise,
            result: { sessionId: 'discovery' },
          },
        ],
        'session/resume': [{ received: resumed }],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Keep this Session' }],
    });

    await host.caller.session.close(created);
    const reader = new AbortController();

    const stream = (
      await host.createCaller({ signal: reader.signal }).session.agentOptions({
        ...created,
        agent: emptySessionInput.agent,
        projectId: emptySessionInput.projectId,
      })
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value).toMatchObject({ commands: null });

    const commands = (async (): Promise<SlashCommand[]> => {
      while (true) {
        const update = await nextUpdate(stream);
        markReady(update, ready);

        if (update.commands !== null) return update.commands;
      }
    })();

    // Keep a failure handled while the scripted resume is still being driven.
    void commands.catch(() => {});
    await discovering.promise;

    if (stage === 'ready') {
      release.resolve();
      await ready.promise;
    }

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Resume this Session' }],
    });
    const request = await resumed.promise;

    await requireScriptedProcessAt(
      host.agent.processes,
      host.agent.processes.length - 1,
    ).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'available_commands_update',
            availableCommands: [
              { name: 'review', description: reviewDescription },
            ],
          },
        },
      ],
      request.sessionId,
    );
    expect(await commands).toEqual([
      { name: 'review', description: reviewDescription },
    ]);
    release.resolve();
    reader.abort();
    await stream.return?.();
  },
);
