import { realpathSync } from 'node:fs';
import { expect, it } from 'vitest';
import { installEntry } from '#mocks/installation';
import { startLaunchHost } from '#mocks/installed-agents';

// A Project registers at its resolved path, so the folder the launch host builds its Project in must already be resolved.
it('builds the launch host Project in an already resolved folder', async () => {
  const { projectPath } = await startLaunchHost(installEntry('npx'));

  expect(projectPath).toBe(realpathSync(projectPath));
});
