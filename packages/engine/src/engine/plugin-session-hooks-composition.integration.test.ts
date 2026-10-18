import type {
  PromptRequest,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { HookEventName } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  hookRecords,
  recordingSource,
  writeHookPlugins,
} from '#mocks/hook-plugins';

const sessionHooks: HookEventName[] = [
  'session.start',
  'prompt.submit',
  'tool.call',
  'turn.complete',
];

const options: RequestPermissionRequest['options'] = [
  { optionId: 'edit-once', name: 'Allow', kind: 'allow_once' },
  { optionId: 'edit-reject', name: 'Reject', kind: 'reject_once' },
];

const editPrompt = 'Edit tool-a';

const prompt = [{ type: 'text' as const, text: editPrompt }];

// Each journey starts the Agent, the recording Plugin and a Turn with one Permission request.
const journeyMs = 20_000;

type Journey = {
  requests: PromptRequest[];
  outcomes: RequestPermissionResponse[];
};

type HookedSession = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
};

// A Session whose prompt asks for one Permission request, with a Plugin hooking every Session event.
async function startHookedSession(
  hooks: string,
  journey: Journey,
): Promise<HookedSession> {
  const host = await startAcpEngine({
    steps: [
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: 'tool-a', title: editPrompt },
          options,
        },
        responses: journey.outcomes,
      },
    ],
    responses: { 'session/prompt': [{ requests: journey.requests }] },
    installPlugins: (home) =>
      writeHookPlugins(home, [
        {
          id: 'recorder',
          source: recordingSource(hooks),
          hooks: sessionHooks,
        },
      ]),
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);

  return { host, sessionId };
}

const passOn = (name: HookEventName): string =>
  `await on('${name}', (ctx, e, next) => next(e));`;

it(
  'runs each Session event through its Hooks: a rewritten prompt reaches the Agent and a denial settles through the Feed',
  async () => {
    const journey: Journey = { requests: [], outcomes: [] };

    const { host, sessionId } = await startHookedSession(
      `${passOn('session.start')}
      await on('prompt.submit', (ctx, e, next) =>
        next({ ...e, prompt: [{ type: 'text', text: '[hooked] ' + e.prompt[0].text }] }));
      await on('tool.call', '${editPrompt}', () => ({ decision: 'deny' }));
      ${passOn('turn.complete')}`,
      journey,
    );

    await host.caller.session.prompt({ sessionId, prompt });
    await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) => snapshot.activeTurnId === null,
    );

    expect(journey.requests.map(({ prompt }) => prompt)).toMatchObject([
      [{ type: 'text', text: `[hooked] ${editPrompt}` }],
    ]);
    expect(journey.outcomes).toEqual([
      { outcome: { outcome: 'selected', optionId: 'edit-reject' } },
    ]);
    await expect
      .poll(async () =>
        (await hookRecords(host.home, 'recorder')).map(({ name }) => name),
      )
      .toEqual(sessionHooks);
    expect(await hookRecords(host.home, 'recorder')).toMatchObject([
      { event: { sessionId, projectId: 'project-1', agent: 'mock' } },
      { event: { sessionId, prompt } },
      { event: { sessionId, request: { toolCallId: 'tool-a' } } },
      { event: { sessionId, stopReason: 'end_turn' } },
    ]);
  },
  journeyMs,
);

it(
  'lets a tool.call Hook allow a Permission request with the Agent’s own option',
  async () => {
    const journey: Journey = { requests: [], outcomes: [] };

    const { host, sessionId } = await startHookedSession(
      `await on('tool.call', () => ({ decision: 'allow' }));`,
      journey,
    );

    await host.caller.session.prompt({ sessionId, prompt });

    await expect
      .poll(() => journey.outcomes)
      .toEqual([{ outcome: { outcome: 'selected', optionId: 'edit-once' } }]);
  },
  journeyMs,
);

it(
  'drops a prompt a prompt.submit Hook drops: no Turn starts and the caller is told',
  async () => {
    const journey: Journey = { requests: [], outcomes: [] };

    const { host, sessionId } = await startHookedSession(
      `await on('prompt.submit', () => ({ dropped: true }));`,
      journey,
    );

    await expect(
      host.caller.session.prompt({
        sessionId,
        prompt: [{ type: 'text', text: 'Never sent' }],
      }),
    ).resolves.toEqual({ messageId: null });
    expect(journey.requests).toEqual([]);
    expect(
      host.database.$client.prepare('SELECT count(*) AS turns FROM turn').get(),
    ).toEqual({ turns: 0 });
  },
  journeyMs,
);
