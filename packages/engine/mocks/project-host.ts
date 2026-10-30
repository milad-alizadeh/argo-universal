import { rmSync } from 'node:fs';
import { makeResolvedTempFolderSync } from '@repo/mocks/fs/resolved-temp-folder';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished, vi } from 'vitest';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';

type ProjectTestHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  projectPath: string;
  git: Awaited<ReturnType<typeof initTestRepository>>;
};

// An Engine whose one registered Project, project-1, is a fresh repository in a temporary folder.
export async function startProjectTestHost(): Promise<ProjectTestHost> {
  const projectPath = makeResolvedTempFolderSync('project-');
  const git = await initTestRepository(projectPath);
  const { database, remove } = openTestDatabase({}, projectPath);
  onTestFinished((): void => removeProject(projectPath, remove));
  vi.stubEnv('ARGO_PROJECT_PATH', projectPath);

  return {
    ...(await startEngineTestHost({ database })),
    projectPath,
    git,
  };
}

const removeProject = (projectPath: string, remove: () => void): void => {
  vi.unstubAllEnvs();
  remove();
  rmSync(projectPath, { recursive: true, force: true });
};
