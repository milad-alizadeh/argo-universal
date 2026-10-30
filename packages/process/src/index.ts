// One lifecycle for a Node child process: start it, wait until it is ready, stop it with everything it launched.
export {
  type ChildCommand,
  type ChildHandle,
  type ChildMessage,
  startChild,
  startService,
} from './child';

export { childEnvironment } from './environment';

export { describeExit, type Exit, hasExited, isAlive } from './exit';

export {
  type GroupPort,
  type GroupRelease,
  releaseProcessGroup,
} from './group';

export { once } from './once';

export { pollUntil } from './poll';

export { stopProcess } from './stop';

export {
  millisecondsPerSecond,
  pollIntervalMs,
  startLimitMs,
  stopLimitMs,
} from './timing';
