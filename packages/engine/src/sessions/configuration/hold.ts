import type { WriterCommit } from '../../storage';
import type { SessionContext, SessionWrite } from '../session-context';
import { withHeldConfiguration } from './held';
import type { ConfigChange, ConfigChoice } from './queue';
import { sessionChoicesJob } from './store';

const heldCommit = (
  context: SessionContext,
  choice: ConfigChoice,
  heldConfig: SessionContext['heldConfig'],
): WriterCommit => ({
  resolve: () =>
    choice.applied?.resolve(
      withHeldConfiguration(context.configOptions, heldConfig),
    ),
  reject: (cause) => choice.applied?.reject(cause),
});

const heldWrite = (
  context: SessionContext,
  choice: ConfigChoice,
  heldConfig: SessionContext['heldConfig'],
): SessionWrite => ({
  job: sessionChoicesJob(context, { heldConfig }),
  committed: heldCommit(context, choice, heldConfig),
});

// A choice made while a Turn runs is stored with the Session and applies when the Agent is idle; its caller sees the held value once the row commits.
export const holdConfigChoice = (
  context: SessionContext,
  choice: ConfigChoice,
): ConfigChange<'heldConfig'> => {
  const heldConfig = [
    ...context.heldConfig.filter(
      ({ configId }) => configId !== choice.configId,
    ),
    { configId: choice.configId, value: choice.value },
  ];

  return {
    change: { heldConfig },
    writes: [heldWrite(context, choice, heldConfig)],
  };
};
