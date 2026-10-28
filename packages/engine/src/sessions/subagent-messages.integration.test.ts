import type { SubagentUpdate, TextContent } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
} from '#mocks/acp-feed';

type ParentFeedHost = Awaited<ReturnType<typeof openAcpFeedSession>>['host'];

type SubagentRowFacts = NonNullable<
  NonNullable<SubagentUpdate['_meta']>['argo']
> &
  Pick<SubagentUpdate, 'subagentState'>;

// What the parent Feed says about its Subagents, in Feed order.
const subagentRowFacts = async (
  host: ParentFeedHost,
  sessionId: string,
): Promise<SubagentRowFacts[]> =>
  (await parentSubagentUpdates(host, sessionId)).map((row) => ({
    ...row._meta?.argo,
    subagentState: row.subagentState,
  }));

const text = (value: string): TextContent => ({ type: 'text', text: value });

const foregroundActions = [
  { action: 'spawn', subagentState: 'running' },
  { action: 'message', prompt: [text('Review the change.')] },
  { subagentState: 'requires_action' },
  { subagentState: 'running' },
  { result: [text('The change looks correct.')] },
  { subagentState: 'idle' },
];

it.each([
  { scenario: 'subagent-foreground', prompts: 1, actions: foregroundActions },
  {
    scenario: 'subagent-more-work',
    prompts: 2,
    actions: [
      ...foregroundActions,
      { action: 'message', prompt: [text('Review the follow-up change.')] },
      { subagentState: 'running' },
      { subagentState: 'idle' },
    ],
  },
] as const)(
  'records each Subagent action of $scenario on the parent Feed',
  async ({ scenario, prompts, actions }) => {
    const { host, sessionId } = await openAcpFeedSession(scenarios[scenario]);

    for (let index = 1; index < prompts; index++) {
      await host.caller.session.prompt({
        sessionId,
        prompt: [text('More work')],
      });
      await waitForAcpSessionIdle(host, sessionId);
    }

    expect(await subagentRowFacts(host, sessionId)).toEqual(actions);
  },
);
