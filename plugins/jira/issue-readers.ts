import { transitionsOf, type JiraTransition } from './issue-fields';
import type { JiraPerson } from './jira-readers';
import { at, list, present, text, type Json } from './json';

// What the issue page's menus offer, and what its writes answer, read from Jira's replies.
export type JiraPriority = { id: string; name: string };

type Read = Json | undefined;

function priorityOf(json: Json): JiraPriority | null {
  const id = text(at(json, 'id'));
  const name = text(at(json, 'name'));

  return id && name ? { id, name } : null;
}

const isApp = (json: Json): boolean =>
  (text(at(json, 'accountType')) ?? 'atlassian') !== 'atlassian';

// Only people, not apps, are offered as assignees.
const personId = (json: Json): string | null =>
  isApp(json) ? null : text(at(json, 'accountId'));

function personOf(json: Json): JiraPerson | null {
  const accountId = personId(json);

  if (!accountId) return null;

  return { accountId, name: text(at(json, 'displayName')) ?? accountId };
}

export const issueReaders = {
  transitions: (json: Read): JiraTransition[] =>
    transitionsOf(at(json, 'transitions')),
  priorities: (json: Read): JiraPriority[] =>
    list(json).map(priorityOf).filter(present),
  assignable: (json: Read): JiraPerson[] =>
    list(json).map(personOf).filter(present),
  // A write answers 204 with no body; any success is enough.
  done: (): true => true,
};
