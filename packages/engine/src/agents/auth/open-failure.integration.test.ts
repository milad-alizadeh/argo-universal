import { RequestError, type NewSessionRequest } from '@agentclientprotocol/sdk';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { agentCredentials } from '#mocks/agent-credentials';
import { sessionJourneyGit } from '#mocks/session-journey';

const storedSessionId = 'session-1';

const authRequiredError = { type: 'auth-required' } as const;

it('an auth-required New worktree open at Send stores no Turn and discards the Checkout', async () => {
  const host = await startAcpEngine(protocolSessionLogin(agentCredentials()));
  const [project] = await host.caller.project.list();

  if (!project) throw new Error('Project is missing');
  const git = sessionJourneyGit(project.path);
  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      checkout: { type: 'worktree', baseBranch: 'main' },
      prompt: [{ type: 'text', text: 'Start' }],
    }),
  ).rejects.toMatchObject({ cause: { openError: authRequiredError } });
  expect(host.database.$client.prepare('SELECT id FROM turn').all()).toEqual(
    [],
  );
  expect(host.database.$client.prepare('SELECT id FROM session').all()).toEqual(
    [{ id: storedSessionId }],
  );
  expect(
    git('worktree', 'list', '--porcelain').match(/^worktree /gm),
  ).toHaveLength(1);
  expect(git('branch', '--list', 'argo/*')).toBe('');
});

it('a mid-Turn auth_required ends its Turn auth_required and tells watching Apps sign-in is required', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { error: RequestError.authRequired().toErrorResponse() },
      ],
    },
  });

  const session = await host.caller.session.new(emptySessionInput);
  const watching = new AbortController();
  onTestFinished(() => watching.abort());

  const changes = (
    await host
      .createCaller({ signal: watching.signal })
      .agents.authChanges({ agent: 'mock', projectId: 'project-1' })
  )[Symbol.asyncIterator]();

  const required = changes.next();
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Start' }],
  });
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(
    host.database.$client
      .prepare('SELECT status, stop_reason FROM turn WHERE session_id = ?')
      .get(session.sessionId),
  ).toEqual({ status: 'ended', stop_reason: 'auth_required' });
  const page = await host.caller.feed.page({ ...session, direction: 'tail' });
  expect(page.rows.at(-1)).toMatchObject({
    sessionUpdate: 'notice',
    _meta: {
      argo: {
        turnEnd: {
          stopReason: 'auth_required',
          error: { code: RequestError.authRequired().code },
          durationMs: expect.any(Number),
        },
      },
    },
  });
  expect((await required).value).toEqual({
    methods: [],
    pending: null,
    outcome: null,
  });
});

it('a past Session reports a typed auth-required failure through its Feed subscription', async () => {
  const entered = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        {
          received: entered,
          waitFor: release.promise,
          error: RequestError.authRequired().toErrorResponse(),
        },
      ],
    },
  });

  const prompt = host.caller.session
    .prompt({
      sessionId: storedSessionId,
      prompt: [{ type: 'text', text: 'Continue' }],
    })
    .catch((cause: unknown) => cause);

  await entered.promise;

  const events = (
    await host.caller.feed.subscribe({
      sessionId: storedSessionId,
      after: null,
    })
  )[Symbol.asyncIterator]();

  await events.next();
  release.resolve();
  expect(await prompt).toMatchObject({
    cause: { openError: authRequiredError },
  });

  for await (const event of {
    [Symbol.asyncIterator]: (): typeof events => events,
  }) {
    if (event.type !== 'closed') continue;
    expect(event).toMatchObject({ openError: authRequiredError });

    return;
  }

  throw new Error('The Feed never reported its failed open');
});

it('typed open failures survive HTTP serialization for an App', async () => {
  const host = await startAcpEngine(protocolSessionLogin(agentCredentials()));

  const response = await fetch(`${host.url}/trpc/session.new`, {
    method: 'POST',
    // The Origin the App's own page sends, which is what proves the call is the Server Device's (#1696).
    headers: { 'Content-Type': 'application/json', origin: 'app://app' },
    body: JSON.stringify(emptySessionInput),
  });

  expect(await response.json()).toMatchObject({
    error: { data: { openError: authRequiredError } },
  });
});
