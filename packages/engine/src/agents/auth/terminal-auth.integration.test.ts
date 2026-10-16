import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const subject = { agent: 'mock', projectId: 'project-1' };

const methodId = 'interactive-subscription';

it(
  'shares a real sign-in PTY across callers, accepts input and succeeds on exit 0',
  { timeout: 20_000 },
  async () => {
    const host = await startAcpEngine({
      ...terminalLogin,
      responses: {},
      steps: [],
    });

    await host.caller.session.new(emptySessionInput);
    const first = host.caller.agents.authenticate({ ...subject, methodId });
    await expect
      .poll(
        async () =>
          (await host.caller.agents.authTerminal({ ...subject, cursor: 0 }))
            .output,
        { timeout: 15_000 },
      )
      .toContain('Continue in your browser');

    const second = host
      .createCaller()
      .agents.authenticate({ ...subject, methodId });

    await host.caller.agents.authTerminalInput({
      ...subject,
      input: { type: 'resize', cols: 100, rows: 30 },
    });
    await host.caller.agents.authTerminalInput({
      ...subject,
      input: { type: 'write', text: '\r' },
    });
    expect(await Promise.all([first, second])).toEqual([
      { status: 'ok' },
      { status: 'ok' },
    ]);
    expect(
      await host.caller.agents.authTerminal({ ...subject, cursor: 0 }),
    ).toMatchObject({ closed: true, exitCode: 0 });
    expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  },
);

it(
  'cancelling kills the PTY and reports failure to every waiting caller',
  { timeout: 20_000 },
  async () => {
    const host = await startAcpEngine({
      ...terminalLogin,
      responses: {},
      steps: [],
    });

    await host.caller.session.new(emptySessionInput);
    const result = host.caller.agents.authenticate({ ...subject, methodId });
    await expect
      .poll(
        async () =>
          (await host.caller.agents.authTerminal({ ...subject, cursor: 0 }))
            .output,
        { timeout: 15_000 },
      )
      .toContain('Continue in your browser');
    await host.caller.agents.cancelAuthenticate(subject);
    expect(await result).toEqual({
      status: 'failed',
      message: 'Sign-in cancelled',
    });
    expect(
      await host.caller.agents.authTerminal({ ...subject, cursor: 0 }),
    ).toMatchObject({ closed: true });
    expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  },
);

it.each(['Login successful', 'Type your message'])(
  'claude-login succeeds on %s and kills the still-running PTY',
  async (pattern) => {
    const host = await startAcpEngine({
      ...terminalLogin,
      responses: {},
      steps: [],
      initialize: {
        ...terminalLogin.initialize,
        authMethods: [
          {
            type: 'terminal',
            id: 'claude-login',
            name: 'Claude',
            args: ['--auth-pattern', pattern],
            env: { ARGO_AUTH_VALUE: 'method-env' },
          },
        ],
      },
    });

    await host.caller.session.new(emptySessionInput);
    expect(
      await host.caller.agents.authenticate({
        ...subject,
        methodId: 'claude-login',
      }),
    ).toEqual({ status: 'ok' });
    expect(
      await host.caller.agents.authTerminal({ ...subject, cursor: 0 }),
    ).toMatchObject({
      closed: true,
      output: expect.stringContaining('method-env'),
    });
  },
);
