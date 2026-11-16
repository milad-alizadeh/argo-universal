import { adfMarkdown } from './adf';
import { at, list, present, text, type Json } from './json';

/*
 * What an issue's page shows beyond its list row, read from the same answer: a search asks for these fields too, so a
 * row seeds its issue's page (Spec 0027). Jira's status, as its id, name and category, is read here for both.
 */
export type StatusCategory = 'new' | 'indeterminate' | 'done';

export type JiraStatus = { id: string; name: string; category: StatusCategory };

// A move Jira allows from an issue's current status, named by the status it leads to.
export type JiraTransition = { id: string; name: string; to: JiraStatus };

export type IssueExtras = {
  description: string;
  labels: string[];
  transitions: JiraTransition[];
};

type Read = Json | undefined;

const categories: readonly StatusCategory[] = ['new', 'indeterminate', 'done'];

const categoryOf = (value: Read): StatusCategory =>
  categories.find((category) => category === value) ?? 'indeterminate';

// A status as Jira answers one, on an issue or as where a transition leads.
export const statusOf = (status: Read): JiraStatus => ({
  id: text(at(status, 'id')) ?? '',
  name: text(at(status, 'name')) ?? 'Unknown',
  category: categoryOf(at(status, 'statusCategory', 'key')),
});

const available = (json: Json): string | null =>
  at(json, 'isAvailable') === false ? null : text(at(json, 'id'));

// A transition Jira lists but will not run now, as one whose conditions fail, is left out.
function transitionOf(json: Json): JiraTransition | null {
  const id = available(json);
  const to = statusOf(at(json, 'to'));

  return id ? { id, name: text(at(json, 'name')) ?? to.name, to } : null;
}

export const transitionsOf = (transitions: Read): JiraTransition[] =>
  list(transitions).map(transitionOf).filter(present);

const labelsOf = (labels: Read): string[] =>
  list(labels).map(text).filter(present);

// The fields and transitions of one issue in a search's or a read's answer.
export const issueExtras = (json: Read): IssueExtras => ({
  description: adfMarkdown(at(json, 'fields', 'description')),
  labels: labelsOf(at(json, 'fields', 'labels')),
  transitions: transitionsOf(at(json, 'transitions')),
});
