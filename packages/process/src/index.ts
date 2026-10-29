// One lifecycle for a Node child process: start it, wait until it is ready, stop it with everything it launched.
export {
  type ChildHandle,
  type ChildMessage,
  startChild,
  startService,
} from './child';

export { childEnvironment } from './environment';

export {
  describeExit,
  type Exit,
  hasExited,
  isAlive,
  signalStop,
} from './exit';

export {
  type GroupPort,
  type GroupRelease,
  releaseProcessGroup,
} from './group';

export { pollUntil } from './poll';

export {
  pollIntervalMs,
  startLimitMs,
  stopGraceMs,
  stopLimitMs,
} from './timing';
