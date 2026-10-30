import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { makeResolvedTempFolderSync } from '@repo/mocks/fs/resolved-temp-folder';
import { onTestFinished, vi } from 'vitest';
import { createAcpResources, type AcpSessionLease } from '../src/agents';
import {
  createResourceOpening,
  deferLaunch,
  resourceLaunch,
} from './acp-resource';

export const openLoginShellAgent = async (): Promise<{
  lease: AcpSessionLease;
  bin: string;
}> => {
  const { directory, bin } = loginProject();
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  const base = createResourceOpening();

  const lease = await resources.open({
    ...base,
    launch: loginLaunch(directory),
  });

  return { lease, bin };
};

const loginLaunch = (directory: string): ReturnType<typeof deferLaunch> =>
  deferLaunch({
    ...resourceLaunch,
    registryId: fixtureRegistryIds[0],
    ...scriptedAgentCommand('reply'),
    cwd: directory,
  });

const loginEnvironment = (directory: string): void => {
  // bash ships on macOS and the Linux CI image; zsh is missing on the latter.
  vi.stubEnv('SHELL', '/bin/bash');
  vi.stubEnv('HOME', directory);
  vi.stubEnv('ANTHROPIC_API_KEY', 'fixture-key-that-must-be-cleared');
};

type LoginProject = { directory: string; bin: string };

const loginProject = (): LoginProject => {
  const directory = makeResolvedTempFolderSync('argo-shell-env-');
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const bin = join(directory, 'bin');
  mkdirSync(bin);
  writeLoginProfile(directory, bin);
  loginEnvironment(directory);

  return { directory, bin };
};

const writeLoginProfile = (directory: string, bin: string): void => {
  writeFileSync(
    join(directory, '.bash_profile'),
    [
      'echo "ARGO_RC_NOISE=printed"',
      'read -r _',
      `export PATH="${bin}:$PATH"`,
      'export ARGO_LOGIN_VALUE=login',
      "export ARGO_MULTILINE=$'first\\nPATH=/injected'",
      '',
    ].join('\n'),
  );
};
