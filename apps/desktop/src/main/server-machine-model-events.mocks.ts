import type { GraphEventFromLogic } from '@repo/vitest/model-graph';
import { readError } from './server-machine-data.mocks';
import {
  countsChangedEvent,
  exitReason,
  machine,
  quitDoneEvent,
  quitErrorEvent,
  retryServerEvent,
  runningAddress,
  spawnedAt,
  staleAddress,
  startedAddress,
  supervisorExitedEvent,
  supervisorSpawnedEvent,
} from './server-machine.mocks';

export { readError } from './server-machine-data.mocks';

export const readAddressDoneEvent = 'xstate.done.actor.readAddress';

export const readAddressErrorEvent = 'xstate.error.actor.readAddress';

export const checkRunningDoneEvent = 'xstate.done.actor.checkRunning';

// Done and error events of invoked actors are not in the machine's event type, but the model drives them. Its delayed transitions need no fixture.
export const fixtures = [
  ...[runningAddress, null, startedAddress, staleAddress].map(
    (output) =>
      ({
        type: readAddressDoneEvent,
        output,
        actorId: 'readAddress',
      }) as const,
  ),
  {
    type: readAddressErrorEvent,
    error: readError,
    actorId: 'readAddress',
  },
  ...[true, false].map(
    (output) =>
      ({
        type: checkRunningDoneEvent,
        output,
        actorId: 'checkRunning',
      }) as const,
  ),
  { type: supervisorSpawnedEvent, pid: startedAddress.pid, at: spawnedAt },
  { type: supervisorExitedEvent, reason: exitReason },
  { type: retryServerEvent },
  { type: 'app.quit' },
  { type: countsChangedEvent, counts: { running: 2, attention: 1 } },
  { type: countsChangedEvent, counts: { running: 0, attention: 0 } },
  { type: countsChangedEvent, counts: { running: 0, attention: 3 } },
  { type: 'counts.disconnected' },
  { type: quitDoneEvent, actorId: 'askQuit', output: true },
  { type: quitDoneEvent, actorId: 'askQuit', output: false },
  {
    type: quitErrorEvent,
    actorId: 'askQuit',
    error: readError,
  },
] satisfies GraphEventFromLogic<typeof machine>[];

export type ServerEvent = (typeof fixtures)[number];
