import type { Page } from '@playwright/test';
import {
  bannerGone,
  bannerUp,
  composerUsable,
  showsLatestMessage,
} from './driver-wait.mts';
import type { DriverAction, ElapsedScenario } from './elapsed-scenario.mts';
import { openLong } from './launch-latency.mts';
import type { SeededServer } from './seed.mts';

export type Milestone = 'ready' | 'reconnected' | 'usable';

const boundaries: Record<Milestone, string> = {
  ready:
    'Server process launch → Server publishes its address (the same port and data); the stop before it is not timed; PF-01 Server half and PF-03 launch-to-ready, with the filesystem cache warm',
  reconnected:
    'Server ready (restart call returned) → the Connection banner gone from the App; PF-03 ready-to-reconnection; the App retries while the Server starts, so a sample near zero means it had already reconnected when the clock started',
  usable:
    'Server ready (restart call returned) → banner gone, latest Feed text drawn and Composer enabled; PF-03 ready-to-usable; the Feed is the one it had before, so currency is not separately checked',
};

interface Restart {
  // Lets the Server start; `ready` settles once the restart has finished.
  release: () => void;
  ready: Promise<void>;
}

// Stops the Server and holds it down until `release`, so what follows is timed from the start.
function holdDown(server: SeededServer): Restart {
  const gate = Promise.withResolvers<void>();
  const ready = server.restart(() => gate.promise);

  // A restart that fails while the App is still being watched is reported by whoever awaits `ready`.
  ready.catch(() => null);

  return { release: gate.resolve, ready };
}

// Holds the Server down once the App shows it is gone; a failure here restarts it first.
async function downUnderApp(
  page: Page,
  server: SeededServer,
): Promise<Restart> {
  const restart = holdDown(server);

  try {
    await bannerUp(page);
  } catch (error) {
    restart.release();
    await restart.ready.catch(() => null);
    throw error;
  }

  return restart;
}

async function reachedMilestone(
  page: Page,
  milestone: Milestone,
): Promise<void> {
  await bannerGone(page);

  if (milestone === 'reconnected') return;
  await showsLatestMessage(page);
  await composerUsable(page);
}

const launchTimed = (restart: Restart): DriverAction => ({
  dispatch: () => Promise.resolve(restart.release()),
  ready: () => restart.ready,
});

// The Server is back before the clock starts; what is left to time is the App catching up.
async function afterReady(
  restart: Restart,
  page: Page,
  milestone: Milestone,
): Promise<DriverAction> {
  restart.release();
  await restart.ready;

  return {
    dispatch: () => Promise.resolve(),
    ready: () => reachedMilestone(page, milestone),
  };
}

async function prepareRestart(
  page: Page,
  server: SeededServer,
  milestone: Milestone,
): Promise<DriverAction> {
  const restart = await downUnderApp(page, server);

  return milestone === 'ready'
    ? launchTimed(restart)
    : afterReady(restart, page, milestone);
}

const serverOnly = (
  milestone: Milestone,
): Pick<ElapsedScenario, 'unthrottled'> =>
  milestone === 'ready'
    ? {
        unthrottled:
          'The Server process is not slowed by browser CPU emulation',
      }
    : {};

/*
 * PF-03: restarts the isolated Server on its own port and data under an App showing the long
 * Session. Each milestone is its own scenario, so each is one interval on one clock.
 */
export async function serverRestart(
  page: Page,
  server: SeededServer,
  milestone: Milestone,
): Promise<ElapsedScenario> {
  await openLong(page, server);

  return {
    condition: 'server-restart',
    boundary: boundaries[milestone],
    driverOnly: true,
    prepare: () => prepareRestart(page, server, milestone),
    ...serverOnly(milestone),
  };
}
