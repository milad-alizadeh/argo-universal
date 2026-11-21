import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';

// The real terminal behind the Operations: no spawner is substituted.
it('records a real Run’s output and makes its real exit code Crashed', async () => {
  vi.stubEnv('SHELL', '/bin/bash');
  onTestFinished(() => void vi.unstubAllEnvs());
  const host = await startAcpEngine({ steps: [] });

  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');
  await mkdir(join(project.path, '.argo'), { recursive: true });
  await writeFile(
    join(project.path, '.argo', 'run.json'),
    JSON.stringify({
      configurations: [{ name: 'boom', command: 'echo compiling; exit 3' }],
    }),
  );
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const { operations } = await operationCaller(host);

  expect(
    await runOperation(operations, {
      id: 'run.start',
      params: { sessionId, name: 'boom' },
    }),
  ).toMatchObject({
    ready: false,
    status: 'crashed',
    exitCode: 3,
    tail: expect.stringContaining('compiling'),
  });

  expect(
    await runOperation(operations, {
      id: 'run.logs',
      params: { sessionId, name: 'boom' },
    }),
  ).toMatchObject({
    status: 'crashed',
    exitCode: 3,
    output: expect.stringContaining('compiling'),
  });
}, 30_000);
