import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  requestFor,
  publish,
  candidateTurn,
  isPrediction,
  assertSharedPredictions,
} from './follow-up-suggestions.test.mocks';

const prompt = [{ type: 'text' as const, text: 'Fix the failing test' }];

const vendorSessionId = 'suggestion-session';

const text = 'Run the regression tests';

it('negotiates with a generic Agent and shares a correlated prediction outside the Feed', async () => {
  const host = await startAcpEngine({
    steps: [],
    sessionIds: [vendorSessionId],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { _meta: { promptSuggestions: { version: 1 } } },
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt,
    followUpSuggestions: true,
  });
  await waitForAcpSessionIdle(host, sessionId);
  const first = await host.caller.session.get({ sessionId });
  const turnId = candidateTurn(first);

  const process = requireScriptedProcessAt(
    host.agent.processes,
    host.agent.processes.length - 1,
  );

  expect(await requestFor(process, 'initialize')).toMatchObject({
    params: {
      clientCapabilities: { _meta: { promptSuggestions: { version: 1 } } },
    },
  });
  expect(await requestFor(process, 'session/prompt')).toMatchObject({
    params: {
      _meta: { promptSuggestions: { enabled: true, promptId: turnId } },
    },
  });

  const readers = [1, 2].map(() =>
    waitForAcpSnapshot(host, sessionId, isPrediction),
  );

  await publish(process, turnId, 'Predicted');

  assertSharedPredictions(await Promise.all(readers), turnId);
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
  expect(JSON.stringify(page.rows)).not.toContain(text);

  await host.caller.session.prompt({
    sessionId,
    prompt,
    followUpSuggestions: true,
  });
  await waitForAcpSessionIdle(host, sessionId);
  const second = await host.caller.session.get({ sessionId });
  expect(second.followUpSuggestion).toEqual({
    turnId: candidateTurn(second),
    text: null,
  });
  expect(candidateTurn(second)).not.toBe(turnId);
  await publish(process, turnId, 'Stale prediction processed');

  const stale = await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.title === 'Stale prediction processed',
  );

  expect(stale.followUpSuggestion).toEqual(second.followUpSuggestion);

  await host.caller.session.prompt({
    sessionId,
    prompt,
    followUpSuggestions: false,
  });
  await waitForAcpSessionIdle(host, sessionId);
  await publish(process, turnId, 'Disabled prediction processed');

  const disabled = await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.title === 'Disabled prediction processed',
  );

  expect(disabled.followUpSuggestion).toBeNull();
});

it('ignores prediction metadata from an Agent that did not negotiate the capability', async () => {
  const host = await startAcpEngine({
    steps: [],
    sessionIds: [vendorSessionId],
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt,
    followUpSuggestions: true,
  });
  await waitForAcpSessionIdle(host, sessionId);

  const process = requireScriptedProcessAt(
    host.agent.processes,
    host.agent.processes.length - 1,
  );

  const request = await requestFor(process, 'session/prompt');
  expect(request).not.toMatchObject({
    params: { _meta: { promptSuggestions: expect.anything() } },
  });
  await publish(process, 'unnegotiated', 'Unsupported prediction processed');

  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.title === 'Unsupported prediction processed',
  );

  expect(snapshot.followUpSuggestion).toBeNull();
});
