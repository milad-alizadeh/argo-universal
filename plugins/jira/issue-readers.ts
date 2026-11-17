import { transitionsOf, type JiraTransition } from './issue-fields';
import { at, list, present, text, type Json } from './json';

// What the issue page's menus offer, and what its writes answer, read from Jira's replies.
export type JiraPriority = { id: string; name: string };

type Read = Json | undefined;

function priorityOf(json: Json): JiraPriority | null {
  const id = text(at(json, 'id'));
  const name = text(at(json, 'name'));

  return id && name ? { id, name } : null;
}

export const issueReaders = {
  transitions: (json: Read): JiraTransition[] =>
    transitionsOf(at(json, 'transitions')),
  priorities: (json: Read): JiraPriority[] =>
    list(json).map(priorityOf).filter(present),
  // A write answers 204 with no body; any success is enough.
  done: (): true => true,
};
