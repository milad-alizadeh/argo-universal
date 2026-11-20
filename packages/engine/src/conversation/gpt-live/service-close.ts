import type { ConversationProviderEvent } from '../provider';

/*
 * What GPT-Live's own close of a call means, in plain words for the Notice. Measured live (#2405 probes, 2026-11-19):
 * `session.closed` carries `reason`; `expired` came about 30 s into a call no audio reached, and `client_request` after
 * Argo's own `session.close`. No idle close came in ten minutes of a call with audio flowing, muted or not; a call's
 * `session.started` gives it an `expires_at` two hours on.
 */

type Closed = Extract<ConversationProviderEvent, { type: 'closed' }>;

const noAudioWhy =
  'GPT-Live ended the call because no audio reached it from the App.';

export const longestWhy =
  'GPT-Live ended the call because it reached the longest a GPT-Live call may last.';

export const goneWhy =
  'GPT-Live ended the call on its side, most likely because the audio between the App and GPT-Live stopped.';

export const lostWhy =
  'The connection to GPT-Live was lost and could not be restored.';

const silentWhy = 'GPT-Live ended the call without saying why.';

// A reason that names a limit or a quota is the person's allowance running out.
const namesLimit = (reason: string): boolean => /limit|quota/i.test(reason);

const whyOf = (reason: string): string =>
  reason === 'expired'
    ? noAudioWhy
    : `GPT-Live ended the call and gave the reason “${reason}”.`;

const givenReason = (reason: string): Closed =>
  namesLimit(reason)
    ? { type: 'closed', reason: 'limit', why: whyOf(reason) }
    : { type: 'closed', reason: 'ended', why: whyOf(reason) };

// The close a `session.closed` frame means, from the reason it carries.
export const serviceClosed = (reason: string | undefined): Closed =>
  reason === undefined
    ? { type: 'closed', reason: 'ended', why: silentWhy }
    : givenReason(reason);
