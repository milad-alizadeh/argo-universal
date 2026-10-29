/*
 * A Turn's life in a Session: it starts, it ends with a Stop reason (ADR-0024 settles its Feed), or the Agent
 * crashes under it, which also ends the Turns of its Subagents. Each step returns the Session change, the
 * writes to store and the events for the Feeds; the Session machine applies them and stays whole.
 */
import { crashAgent } from './crash';
import { connectionLostDuringTurn, endTurn } from './end';
import { startTurn } from './start';

export const sessionTurn = {
  start: startTurn,
  end: endTurn,
  crash: crashAgent,
  // What a Turn ends with when its Agent connection fails under it.
  connectionLost: connectionLostDuringTurn,
};

export type {
  EndTurnParameters,
  StartTurnParameters,
  TurnStep,
} from './values';

// Whether any open Session has a Turn running, for keeping the Mac awake and for Plugins.
export { watchTurnActivity } from './activity';
