import type { LinkRead } from './pull-changes';
import type { PullInfo } from './pull-info';
import { urlReference } from './pull-reference';
import type { PullKey } from './pull-store';

// A link as the Slot asks about it: its URL, and the Project it is drawn in.
type Asked = Readonly<{ href: string; projectId: string }>;

// The pull request a link points at, with the URL it answers for.
export type MarkedLink = PullKey & { href: string };

type Mark = {
  kind: 'pullRequest';
  state: 'open' | 'closed' | 'merged' | 'draft';
};

const linkOf = ({ href, projectId }: Asked): MarkedLink[] => {
  const reference = urlReference(href);

  return reference ? [{ ...reference, projectId, href }] : [];
};

// The pull requests the links point at; a link to anything else is not this Plugin's to answer.
export const markedLinks = (asked: readonly Asked[]): MarkedLink[] =>
  asked.flatMap(linkOf);

// A draft is an open pull request that says it is not ready; the other stages are the mark's own.
const stateOf = ({ stage, draft }: PullInfo): Mark['state'] =>
  stage === 'open' && draft ? 'draft' : stage;

const entryOf = ({ link, pull }: LinkRead<MarkedLink>): [string, Mark[]][] =>
  pull.data
    ? [[link.href, [{ kind: 'pullRequest', state: stateOf(pull.data) }]]]
    : [];

// Each link's mark, from the record every other surface reads; a pull request never read has none yet.
export const linkMarks = (
  reads: readonly LinkRead<MarkedLink>[],
): Record<string, Mark[]> => Object.fromEntries(reads.flatMap(entryOf));
