import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';

const installOperation = 'agent.installInstructions';

const skillPath = '.agents/skills/argo/SKILL.md';

const rulesPath = '.codex/rules/argo.rules';

it('writes Agent instructions only on explicit execution and repairs them on the next execution', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'argo-user-instructions-'));
  onTestFinished(() => rm(userHome, { recursive: true, force: true }));
  const host = await startEngineTestHost({ userHome });
  const caller = await operationCaller(host);
  await caller.operations.list.query({ filter: 'access' });
  await caller.operations.run.mutate({
    id: 'agent.setAccess',
    params: { enabled: false },
  });
  expect(await readdir(userHome)).toEqual([]);

  const installed = await caller.operations.run.mutate({
    id: installOperation,
    params: {},
  });

  expect(installed).toEqual({ updated: false });
  const skill = join(userHome, skillPath);
  const claude = join(userHome, '.claude/skills/argo/SKILL.md');
  const rule = join(userHome, rulesPath);
  const content = await readFile(skill, 'utf8');
  expect(content).toContain('argo operations <filter> --json');
  expect(content.indexOf('argo operations')).toBeLessThan(
    content.indexOf('argo run'),
  );
  expect(content).toContain('--wait');
  expect(content).toContain('argo wait');
  expect(await readFile(claude, 'utf8')).toBe(content);
  expect(await readFile(rule, 'utf8')).toBe(
    'prefix_rule(pattern=["argo"], decision="allow")\n',
  );
  const unrelated = join(dirname(skill), '../other/SKILL.md');
  await mkdir(dirname(unrelated), { recursive: true });
  await writeFile(unrelated, 'keep this skill');
  await writeFile(skill, 'outdated instructions');
  await writeFile(rule, 'outdated rule');
  expect(
    await caller.operations.run.mutate({
      id: installOperation,
      params: {},
    }),
  ).toEqual({ updated: true });
  expect(await readFile(skill, 'utf8')).toBe(content);
  expect(await readFile(rule, 'utf8')).toContain('decision="allow"');
  expect(await readFile(unrelated, 'utf8')).toBe('keep this skill');
});

it('refuses a redirected instructions directory without touching a Project', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'argo-user-redirect-'));
  const project = await mkdtemp(join(tmpdir(), 'argo-project-protected-'));
  onTestFinished(async () => {
    await rm(userHome, { recursive: true, force: true });
    await rm(project, { recursive: true, force: true });
  });
  await writeFile(join(project, 'keep.txt'), 'Project data');
  await symlink(project, join(userHome, '.claude'));
  const host = await startEngineTestHost({ userHome });
  const caller = await operationCaller(host);
  await expect(
    caller.operations.run.mutate({
      id: installOperation,
      params: {},
    }),
  ).rejects.toThrow('symbolic link');
  expect(await readdir(project)).toEqual(['keep.txt']);
  expect(await readFile(join(project, 'keep.txt'), 'utf8')).toBe(
    'Project data',
  );
  expect(await readdir(userHome)).toEqual(['.claude']);
});

it('reports incomplete writes honestly and repairs the installation on retry', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'argo-user-repair-'));
  onTestFinished(() => rm(userHome, { recursive: true, force: true }));
  await mkdir(join(userHome, rulesPath), { recursive: true });
  const host = await startEngineTestHost({ userHome });
  const caller = await operationCaller(host);
  await expect(
    caller.operations.run.mutate({
      id: installOperation,
      params: {},
    }),
  ).rejects.toThrow('2 of 3 files updated');
  await rm(join(userHome, rulesPath), { recursive: true });
  expect(
    await caller.operations.run.mutate({
      id: installOperation,
      params: {},
    }),
  ).toEqual({ updated: true });
  expect(await readFile(join(userHome, rulesPath), 'utf8')).toBe(
    'prefix_rule(pattern=["argo"], decision="allow")\n',
  );
  expect(await readdir(join(userHome, '.codex/rules'))).toEqual(['argo.rules']);
});

it('refuses destinations inside a registered Project and accepts no custom destination', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'argo-user-project-'));
  onTestFinished(() => rm(userHome, { recursive: true, force: true }));
  const projectPath = join(userHome, '.agents');
  await mkdir(projectPath);
  const storage = openTestDatabase({}, projectPath);
  onTestFinished(storage.remove);

  const host = await startEngineTestHost({
    database: storage.database,
    userHome,
  });

  const caller = await operationCaller(host);
  await expect(
    caller.operations.run.mutate({
      id: installOperation,
      params: {},
    }),
  ).rejects.toThrow('inside a Project');
  await expect(
    caller.operations.run.mutate({
      id: installOperation,
      params: { path: projectPath },
    }),
  ).rejects.toThrow('Unrecognized key');
  expect(await readdir(projectPath)).toEqual([]);
  expect(await readdir(userHome)).toEqual(['.agents']);
});
