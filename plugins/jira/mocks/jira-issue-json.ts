import type { Json, JsonObject } from '../json';
import type { FixtureIssue } from './jira-data';
import {
  priorities,
  statusOf,
  transitionsFrom,
  type Transition,
} from './jira-workflow';

/*
 * An issue as Jira answers it: only the fields the request names, as Jira does, so a page that forgets to ask for a
 * field draws without it here too; its transitions only when the request expands them.
 */
export type Asked = Readonly<{ fields: string[] | null; expand: string }>;

const statusJson = ({ id, name, category }: Transition['to']): Json => ({
  id,
  name,
  statusCategory: { key: category },
});

const transitionJson = ({ id, name, to, isAvailable }: Transition): Json => ({
  id,
  name,
  isAvailable,
  to: statusJson(to),
});

export const transitionsJson = (issue: FixtureIssue): Json =>
  transitionsFrom(issue).map(transitionJson);

const priorityJson = ({ priority }: FixtureIssue): Json =>
  priorities.find(({ name }) => name === priority) ?? null;

const allFields = (issue: FixtureIssue, projectKey: string): JsonObject => ({
  summary: issue.summary,
  status: statusJson(statusOf(issue)),
  assignee: issue.assignee,
  priority: priorityJson(issue),
  labels: issue.labels ?? [],
  description: issue.description ?? null,
  project: { key: projectKey },
});

// The fields named, or all of them when the request names none.
const fieldsJson = (all: JsonObject, fields: string[] | null): JsonObject =>
  fields
    ? Object.fromEntries(
        Object.entries(all).filter(([name]) => fields.includes(name)),
      )
    : all;

export function issueJson(
  issue: FixtureIssue,
  projectKey: string,
  { fields, expand }: Asked,
): Json {
  const json = {
    key: issue.key,
    fields: fieldsJson(allFields(issue, projectKey), fields),
  };

  return expand.split(',').includes('transitions')
    ? { ...json, transitions: transitionsJson(issue) }
    : json;
}
