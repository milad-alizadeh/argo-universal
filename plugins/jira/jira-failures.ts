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

const messageOf = (meaning: Known, reason: string | null): string =>
  meaning.jiraSaysWhy ? (reason ?? meaning.says) : meaning.says;

const badRequest = 400;

/*
 * Refusals Jira words as something else: a search naming a project that is gone, or that the person can no longer
 * see, is a 400 about its JQL; a scoped token without a scope the call needs is a 401, though the token is still good.
 */
const reworded = [
  {
    status: badRequest,
    says: /does not exist for the field 'project'/u,
    failure: {
      kind: 'not-found',
      message:
        'This Jira project is gone, or your Atlassian account can no longer see it. Choose another Jira project.',
    },
  },
  {
    status: unauthorized,
    says: /scope does not match/iu,
    failure: {
      kind: 'forbidden',
      message:
        'Your API token doesn’t have the scopes this needs. Create a token with the Jira scopes on the sign-in page, then sign in with it.',
    },
  },
] as const satisfies readonly {
  status: number;
  says: RegExp;
  failure: JiraFailure;
}[];

type Reply = NonNullable<JiraReply>;

function rewordedFor({ status, body }: Reply): JiraFailure | undefined {
  const reason = jiraReason(body) ?? '';

  return reworded.find(
    (each) => each.status === status && each.says.test(reason),
  )?.failure;
}

// What Jira's reply means for the person, in Jira's words where they say it better.
function meaningOf({ status, body }: Reply): JiraFailure {
  const meaning = known.get(status) ?? otherFailure(status);

  return { kind: meaning.kind, message: messageOf(meaning, jiraReason(body)) };
}

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

  return rewordedFor(reply) ?? meaningOf(reply);
}
