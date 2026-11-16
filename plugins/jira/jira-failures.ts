import type { JiraFailure, JiraReply } from './jira-client';
import { at, list, parseJson, present, text } from './json';

// What each refusal Jira answers means for the person, and whether Jira's own words say it better.
type Known = Readonly<{
  kind: JiraFailure['kind'];
  says: string;
  jiraSaysWhy: boolean;
}>;

const unauthorized = 401;

const forbidden = 403;

const notFound = 404;

const tooManyRequests = 429;

const known = new Map<number, Known>([
  // Atlassian's words for a refused sign-in name no next step.
  [
    unauthorized,
    {
      kind: 'signed-out',
      says: 'Jira no longer accepts this sign-in.',
      jiraSaysWhy: false,
    },
  ],
  [
    forbidden,
    {
      kind: 'forbidden',
      says: 'Your Jira account or token doesn’t have permission for this.',
      jiraSaysWhy: true,
    },
  ],
  [
    notFound,
    {
      kind: 'not-found',
      says: 'Jira couldn’t find this. It may have been deleted or moved.',
      jiraSaysWhy: true,
    },
  ],
  [
    tooManyRequests,
    {
      kind: 'rate-limited',
      says: 'Jira is limiting requests right now. Try again in a minute.',
      jiraSaysWhy: false,
    },
  ],
]);

const otherFailure = (status: number): Known => ({
  kind: 'failed',
  says: `Jira answered ${status}. Try again.`,
  jiraSaysWhy: true,
});

// Jira's own words for a refusal, when its body has them.
function jiraReason(body: string): string | null {
  const json = parseJson(body);
  const messages = list(at(json, 'errorMessages')).map(text).filter(present);

  return messages.at(0) ?? text(at(json, 'message'));
}

const messageOf = (meaning: Known, body: string): string =>
  meaning.jiraSaysWhy ? (jiraReason(body) ?? meaning.says) : meaning.says;

const signedOut: JiraFailure = {
  kind: 'signed-out',
  message: 'Sign in to Jira.',
};

export const unreachable: JiraFailure = {
  kind: 'failed',
  message: 'Couldn’t reach Jira. Check your connection and try again.',
};

// A reply that is not a success, as the failure the page draws.
export function failureOf(reply: JiraReply): JiraFailure {
  if (!reply) return signedOut;

  const meaning = known.get(reply.status) ?? otherFailure(reply.status);

  return { kind: meaning.kind, message: messageOf(meaning, reply.body) };
}
