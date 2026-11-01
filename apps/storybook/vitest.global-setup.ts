import {
  lockBrowserSuite,
  releaseAtRunEnd,
  runHostSchema,
} from '@repo/browser-suite-lock';
import type { TestProject } from 'vitest/node';

// Storybook's test widget keeps Vitest watching for the whole session, so only a finite run queues for the lock.
export default async function queueBrowserSuite(
  project: TestProject,
): Promise<(() => void) | undefined> {
  if (project.globalConfig.watch) return undefined;

  const release = await lockBrowserSuite();

  if (release) {
    releaseAtRunEnd(runHostSchema.parse(project.vitest), release, () =>
      process.exit(),
    );
  }

  return release;
}
