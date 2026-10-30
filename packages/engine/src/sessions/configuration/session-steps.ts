import type { SessionContext } from '../session-context';
import { restoreConfiguration, sendChoice } from './agent-session';
import { hasRoomForChoice } from './capacity';
import { holdChoice } from './hold-for-next-turn';
import {
  abandonChoices,
  beginChoice,
  queueChoice,
  releaseHeldChoices,
} from './queue';
import { reportAgentUpdate } from './report';
import { settleChoice } from './settle';
import type { ConfigChoice, ConfigurationStep } from './values';

// A choice applies now, or waits for the next Turn when the Agent is busy or already holds choices.
const choose = (
  context: SessionContext,
  choice: ConfigChoice,
  when: 'now' | 'nextTurn',
): ConfigurationStep =>
  when === 'now' ? queueChoice(context, choice) : holdChoice(context, choice);

/*
 * What the Session machine does with its choices, in Session terms. Steps return the Session change and the writes
 * to store; `send` and `restore` talk to the Agent.
 */
export const sessionConfiguration = {
  choose,
  hasRoom: hasRoomForChoice,
  begin: beginChoice,
  send: sendChoice,
  settle: settleChoice,
  report: reportAgentUpdate,
  releaseHeld: releaseHeldChoices,
  abandon: abandonChoices,
  restore: restoreConfiguration,
};
