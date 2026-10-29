import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import {
  askToLeavePlanMode,
  leavePlanMode,
  leavePlanModeOptions,
  leavePlanModeSteps,
  withMode,
} from '@repo/mocks/agent/plan-mode-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  answerLeavePlanMode,
  permissionSteps,
} from './acp-requests-scenarios.test.mocks';
import {
  type Outcomes,
  alwaysAllow,
  editToolTitle,
  exactOptions,
  promptSession,
  startSession,
  waitForPermission,
  waitForTurnEnd,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it('presents the exact options the Agent offered', async () => {
    const { host, sessionId } = await startSession(
      agent,
      permissionSteps([], ['tool-a']),
    );

    expect(await waitForPermission(host, sessionId)).toEqual({
      requestId: expect.any(String),
      toolCallId: 'tool-a',
      title: editToolTitle,
      options: exactOptions,
    });
  });

  it('presents a request to leave plan mode as a Permission request with all its options', async () => {
    const { host, sessionId } = await startSession(agent, askToLeavePlanMode());

    expect(await waitForPermission(host, sessionId)).toEqual({
      requestId: expect.any(String),
      toolCallId: leavePlanMode.toolCallId,
      title: leavePlanMode.title,
      plan: leavePlanMode.rawInput.plan,
      options: leavePlanModeOptions,
    });
  });

  it('sends only the chosen option when the user keeps planning', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      askToLeavePlanMode(outcomes),
    );

    await answerLeavePlanMode(host, sessionId, 'reject');
    expect(outcomes).toEqual([
      { outcome: { outcome: 'selected', optionId: 'reject' } },
    ]);
  });

  it('shows code mode once the user approves the plan', async () => {
    const host = await startAcpEngine(
      { steps: leavePlanModeSteps, configOptions: withMode('plan') },
      undefined,
      agent,
    );

    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await promptSession(host, sessionId);
    await answerLeavePlanMode(host, sessionId, 'exit-plan-default');
    expect(
      (await waitForTurnEnd(host, sessionId)).configOptions,
    ).toContainEqual(
      expect.objectContaining({ configId: 'mode', currentValue: 'code' }),
    );
  });

  it('settles only the answered request with its exact option while the prompt still runs', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a', 'tool-b']),
    );

    const first = await waitForPermission(host, sessionId, 'tool-a');
    await host.caller.session.answerPermission({
      sessionId,
      requestId: first.requestId,
      optionId: alwaysAllow,
    });
    await waitForPermission(host, sessionId, 'tool-b');
    expect(outcomes).toEqual([
      { outcome: { outcome: 'selected', optionId: alwaysAllow } },
    ]);
  });
});
