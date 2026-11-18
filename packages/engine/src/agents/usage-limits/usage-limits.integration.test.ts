import type { AgentUsageLimits } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const subject = { agent: 'mock', projectId: emptySessionInput.projectId };

const rateLimit = {
  status: 'allowed_warning',
  rateLimitType: 'five_hour',
  resetsAt: 1_795_000_000,
  utilization: 0.9,
};

const usageUpdate = {
  sessionUpdate: 'usage_update' as const,
  used: 2,
  size: 200_000,
  _meta: { '_claude/rateLimit': rateLimit },
};

const fiveHour = {
  id: 'five_hour',
  label: '5-hour limit',
  window: 'five_hour',
  capacity: 'available',
  measure: { kind: 'fraction', used: 0.9 },
  resetsAt: '2026-11-18T11:06:40.000Z',
  observed: 'admission',
  observedAt: expect.any(String),
};

// One Device's `agents.usageLimitsChanges` subscription, collected until the test ends.
const watchUsageLimits = async (
  host: Host,
  watched = subject,
): Promise<AgentUsageLimits[]> => {
  const watching = new AbortController();
  onTestFinished(() => watching.abort());
  const seen: AgentUsageLimits[] = [];

  const changes = await host
    .createCaller({ signal: watching.signal })
    .agents.usageLimitsChanges(watched);

  void (async (): Promise<void> => {
    for await (const change of changes) seen.push(change);
  })();

  return seen;
};

it("keeps the Usage limits an Agent's update reports for its Agent and Project", async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [{ type: 'update', update: usageUpdate }],
          result: { stopReason: 'end_turn' },
        },
      ],
    },
  });

  expect(await host.caller.agents.usageLimits(subject)).toEqual({
    limits: [],
  });
  const seen = await watchUsageLimits(host);

  const otherProject = await watchUsageLimits(host, {
    ...subject,
    projectId: 'project-2',
  });

  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Use some of the plan' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);

  expect(await host.caller.agents.usageLimits(subject)).toEqual({
    limits: [fiveHour],
  });
  await expect.poll(() => seen).toEqual([{ limits: [fiveHour] }]);
  expect(otherProject).toEqual([]);
});
