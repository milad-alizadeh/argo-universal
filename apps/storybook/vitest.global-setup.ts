import { lockBrowserSuite } from '@repo/browser-suite-lock';
import type { TestProject } from 'vitest/node';

// Storybook's test widget keeps Vitest watching for the whole session, so only a finite run queues for the lock.
export default async function queueBrowserSuite(
  project: TestProject,
): Promise<(() => void) | undefined> {
  return project.globalConfig.watch ? undefined : lockBrowserSuite();
}
