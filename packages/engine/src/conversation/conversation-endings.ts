import type { ConversationEnd } from '@repo/contracts';
import type { RunningCall } from './conversation-types';
import type { ConversationClosedReason, ConversationProviderEvent } from './provider';
import type { ConversationNotice } from './session-link';

// How a call ended: why, and when the provider closed it, the provider's own reason and its words for it.
export type EndParameters = {
  reason: ConversationEnd;
  closed?: ConversationClosedReason;
  why?: string;
};

const endOfClose = (closed: ConversationClosedReason): ConversationEnd =>
  closed === 'limit' ? 'limit-reached' : 'provider-closed';

const whyOf = (why: string | undefined): { why?: string } =>
  why === undefined ? {} : { why };

// How a provider's close ends the call: a reached limit is its own ending, any other close is the provider's.
export function closeEndingOf(event: ConversationProviderEvent): EndParameters {
  if (event.type !== 'closed') return { reason: 'provider-closed' };

  return {
    reason: endOfClose(event.reason),
    closed: event.reason,
    ...whyOf(event.why),
  };
}

// What the ending knows besides its parameters: the failure a failed call recorded, and the idle period.
export type EndingFacts = { failure: string | null; idleMs: number };

const ended = 'Conversation ended';

const plural = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

const minuteMs = 60_000;

const secondMs = 1000;

const spanOf = (ms: number): string =>
  ms % minuteMs === 0
    ? plural(ms / minuteMs, 'minute')
    : plural(Math.round(ms / secondMs), 'second');

const lostNotice: ConversationNotice = {
  title: `${ended}: connection lost`,
  description:
    'Argo lost its connection to the Conversation provider and could not get it back.',
};

const closedNotice: ConversationNotice = {
  title: ended,
  description: 'The Conversation provider ended the call without saying why.',
};

// The provider's own words, when it gave some, say why under the title its kind of close has.
function providerNotice({ closed, why }: EndParameters): ConversationNotice {
  const notice = closed === 'lost' ? lostNotice : closedNotice;

  return why === undefined ? notice : { ...notice, description: why };
}

type NoticeOf = (params: EndParameters, facts: EndingFacts) => ConversationNotice;

const notices: Partial<Record<ConversationEnd, NoticeOf>> = {
  'provider-closed': providerNotice,
  'limit-reached': () => ({
    title: `${ended}: usage limit reached`,
    description:
      'The Conversation provider closed the call because the allowance ran out. Start a new call once it resets.',
  }),
  failed: (_, { failure }) => ({
    title: 'Conversation failed',
    description: failure ?? 'The connection to the voice failed.',
  }),
  'app-disconnected': () => ({
    title: `${ended}: the App disconnected`,
    description:
      'The App carrying the call closed, reloaded or lost its connection to the Server, so the call ended with it.',
  }),
  'engine-stopped': () => ({
    title: `${ended}: the Server stopped`,
    description: 'The Argo Server stopped, so the call ended with it.',
  }),
  idle: (_, { idleMs }) => ({
    title: `${ended}: no one spoke`,
    description: `The call heard no speech for ${spanOf(idleMs)} and ended by itself, so the microphone was not left open.`,
  }),
};

/*
 * The Notice an ending leaves in the call's Session, or null for an ending the person or the Agent chose: hanging up,
 * the Agent's Operation, or closing or archiving the Session. Every other ending says why.
 */
export const endNoticeOf = (
  params: EndParameters,
  facts: EndingFacts,
): ConversationNotice | null => notices[params.reason]?.(params, facts) ?? null;

const tenths = (ms: number): string => (ms / secondMs).toFixed(1);

const ranFor = (call: RunningCall, now: number): string =>
  call.startedAt === null
    ? 'before it connected'
    : `after ${tenths(now - Date.parse(call.startedAt))} s`;

const labelled = (label: string, text: string | null | undefined): string[] =>
  (text ?? '') === '' ? [] : [`${label}: ${text}`];

const failureOf = (params: EndParameters, facts: EndingFacts): string | null =>
  params.reason === 'failed' ? facts.failure : null;

const parts = (
  call: RunningCall,
  params: EndParameters,
  facts: EndingFacts,
): string[] => [
  ...labelled('provider said', params.why),
  ...labelled('failure', failureOf(params, facts)),
  ...labelled('provider noted', call.trail.join('; ')),
];

const headOf = (
  call: RunningCall,
  params: EndParameters,
  now: number,
): string => {
  const closed = params.closed === undefined ? '' : ` (${params.closed})`;

  return `call ${call.conversationId} in Session ${call.sessionId} ended: ${params.reason}${closed} ${ranFor(call, now)}`;
};

export type EndingLog = {
  call: RunningCall;
  params: EndParameters;
  facts: EndingFacts;
  now: number;
};

// The Server's log line for a call's end: which call, why, how long it ran, and what the provider noted on the way.
export const endLogLine = ({ call, params, facts, now }: EndingLog): string =>
  [headOf(call, params, now), ...parts(call, params, facts)].join('; ');
