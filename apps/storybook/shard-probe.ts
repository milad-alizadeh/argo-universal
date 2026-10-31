import { afterAll, beforeEach } from 'vitest';
import { trackFrames } from './shard-probe-frames';
import { listenForInput, listenForMessages } from './shard-probe-input';
import { noteTest } from './shard-probe-page';
import { formatReport, safeSnapshot } from './shard-probe-report';
import { observeMutations, startTimeline } from './shard-probe-timeline';

function watchPage(): () => void {
  trackFrames();
  const stopInput = listenForInput();
  const stopMessages = listenForMessages();
  const mutations = observeMutations();

  return (): void => {
    stopInput();
    stopMessages();
    mutations.disconnect();
  };
}

/*
 * A diagnostic, not a test: it asserts nothing and changes nothing a test waits for. It records
 * what the page saw around each story (pointer and focus events, removed elements, animations,
 * pending frames) and prints that only when the story fails, so a failure that shows only in CI
 * says which story ran before it in the same page and where the pointer was. See #1590, #1625, #1626.
 */
export function installShardProbe(): void {
  const stop = watchPage();
  afterAll(stop);
  beforeEach(({ task, onTestFailed }): void => {
    const record = noteTest(task.file.name, task.name);
    const start = safeSnapshot(record);
    startTimeline();
    onTestFailed((): void => {
      console.error(formatReport(record, start));
    });
  });
}
