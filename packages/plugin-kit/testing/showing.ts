import type { PageClock } from './page-clock';
import type { PageMarks } from './page-marks';
import type { PageServer } from './page-server';

/*
 * Where an open page's draws and runs go, the clock its edits wait on, the wait for the Plugin's changes and reads
 * to land, and the marks they send.
 */
export type Showing = {
  server: PageServer;
  clock: PageClock;
  settled: () => Promise<void>;
  marks: PageMarks;
};
