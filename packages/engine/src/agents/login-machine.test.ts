import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { expect, it } from 'vitest';
import { createActor } from 'xstate';
import { getAdjacencyMap, type AdjacencyMap } from 'xstate/graph';
import {
  input,
  paths,
  key,
  options,
  openDone,
  openError,
  authenticateDone,
  authenticateError,
  checkDone,
  checkError,
  closeDone,
  closeError,
  type LoginGraphEvent,
  type LoginSnapshot,
} from '../../mocks/agents/login-model';
import type { LoginAgentOutcome } from './agent-launch';
import { loginMachine } from './login-machine';

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks login ownership lifecycle path %i', async (_, path): Promise<void> => {
  const opened = Promise.withResolvers<boolean>();
  const authenticated = Promise.withResolvers<void>();
  const checked = Promise.withResolvers<LoginAgentOutcome>();
  const closed = Promise.withResolvers<void>();
  const actor = createActor(loginMachine, {
    input: {
      ...input,
      open: () => opened.promise,
      authenticate: () => authenticated.promise,
      checkReady: () => checked.promise,
      close: () => closed.promise,
    },
  }).start();
  try {
    for (const step of path.steps) {
      await deliver({
        event: step.event,
        actor,
        opened,
        authenticated,
        checked,
        closed,
      });
      expect(key(actor.getSnapshot())).toBe(key(step.state));
    }
  } finally {
    actor.stop();
  }
});
const deliver = async ({
  event,
  actor,
  opened,
  authenticated,
  checked,
  closed,
}: {
  event: LoginGraphEvent;
  actor: ReturnType<typeof createActor<typeof loginMachine>>;
  opened: ReturnType<typeof Promise.withResolvers<boolean>>;
  authenticated: ReturnType<typeof Promise.withResolvers<void>>;
  checked: ReturnType<typeof Promise.withResolvers<LoginAgentOutcome>>;
  closed: ReturnType<typeof Promise.withResolvers<void>>;
}): Promise<void> => {
  switch (event.type) {
    case openDone:
      opened.resolve(event.output);
      break;
    case openError:
      opened.reject(event.error);
      break;
    case authenticateDone:
      authenticated.resolve();
      break;
    case authenticateError:
      authenticated.reject(event.error);
      break;
    case checkDone:
      checked.resolve(event.output);
      break;
    case checkError:
      checked.reject(event.error);
      break;
    case closeDone:
      closed.resolve();
      break;
    case closeError:
      closed.reject(event.error);
      break;
    default:
      actor.send(event);
  }
  await Promise.resolve();
  await Promise.resolve();
};
it('login lifecycle paths cover every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<LoginSnapshot, LoginGraphEvent> =>
            getAdjacencyMap(loginMachine, options),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});
