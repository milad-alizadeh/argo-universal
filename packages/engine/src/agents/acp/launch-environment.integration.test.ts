import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { openLoginShellAgent } from '#mocks/acp-shell';

const readProcessId = (sessionId: string): number =>
  Number(sessionId.split(':')[0]);

const group = (pid: number): string =>
  execFileSync('/bin/ps', ['-o', 'pgid=', '-p', String(pid)], {
    encoding: 'utf8',
  }).trim();

const loginEnvironment = z.object({
  PATH: z.string(),
  ARGO_LOGIN_VALUE: z.string(),
  ARGO_MULTILINE: z.string(),
  ARGO_RC_NOISE: z.string().optional(),
  ANTHROPIC_API_KEY: z.string(),
});

const openLoginEnvironment = async (): Promise<{
  environment: z.infer<typeof loginEnvironment>;
  bin: string;
}> => {
  const { lease, bin } = await openLoginShellAgent();

  return {
    environment: loginEnvironment.parse(
      lease.initialization._meta?.['environment'],
    ),
    bin,
  };
};

it('the Agent inherits its Project login-shell PATH', async () => {
  const { environment, bin } = await openLoginEnvironment();

  expect(environment.PATH.split(':')[0]).toBe(bin);
  expect(environment.ARGO_LOGIN_VALUE).toBe('login');
});

it('the login-shell capture keeps multi-line values whole and ignores what rc files print', async () => {
  const { environment } = await openLoginEnvironment();

  expect(environment.ARGO_MULTILINE).toBe('first\nPATH=/injected');
  expect(environment.ARGO_RC_NOISE).toBeUndefined();
});

it('the Registry vendor API key reaches the Agent blank', async () => {
  const { environment } = await openLoginEnvironment();

  expect(environment.ANTHROPIC_API_KEY).toBe('');
});

it('the Agent stays in the Engine process group', async () => {
  const { lease } = await openLoginShellAgent();

  const engineGroup = group(process.pid);
  const agentGroup = group(readProcessId(lease.sessionId));
  console.info(
    `Agent process group ${agentGroup}; Engine process group ${engineGroup}`,
  );
  expect(agentGroup).toBe(engineGroup);
});
