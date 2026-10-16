import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuthMethodTerminal } from '@agentclientprotocol/sdk';
import { terminalLogin } from '@repo/mocks/agent/terminal-login';
import { beforeEach, expect, onTestFinished, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';

export const subject = { agent: 'mock', projectId: 'project-1' };

export const methodId = 'interactive-subscription';

export const terminalStartup = { timeout: 15_000 };

// Real sign-in terminals record their process groups under ARGO_HOME.
export const isolateTerminalHome = (): void =>
  beforeEach(async () => {
    const home = await mkdtemp(join(tmpdir(), 'argo-auth-terminal-'));
    vi.stubEnv('ARGO_HOME', home);
    onTestFinished(async () => {
      await rm(home, { recursive: true, force: true });
      vi.unstubAllEnvs();
    });
  });

export type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// An Engine whose scripted Agent offers one terminal method, after an open has started the Agent.
export const startTerminalAuth = async (
  method: Partial<AuthMethodTerminal>,
  agent = subject.agent,
): Promise<Host> => {
  const host = await startAcpEngine(
    {
      ...terminalLogin,
      responses: {},
      steps: [],
      initialize: {
        ...terminalLogin.initialize,
        authMethods: [
          { type: 'terminal', id: methodId, name: 'Sign in', ...method },
        ],
      },
    },
    undefined,
    agent,
  );

  await host.caller.session.new({ ...emptySessionInput, agent });

  return host;
};

export const readTerminal = (
  host: Host,
  agent = subject.agent,
): ReturnType<Host['caller']['agents']['authTerminal']> =>
  host.caller.agents.authTerminal({ ...subject, agent, cursor: 0 });

// Waits for the interactive prompt; returns the pid the program printed, if any.
export const awaitPrompt = async (host: Host): Promise<number> => {
  await expect
    .poll(async () => (await readTerminal(host)).output, terminalStartup)
    .toContain('Continue in your browser');

  return Number(/pid (\d+)/u.exec((await readTerminal(host)).output)?.[1]);
};
