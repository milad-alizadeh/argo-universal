import { at, list, present, text, type Json } from '../json';
import type { FixtureIssue } from './jira-data';
import { issueJson, type Asked } from './jira-issue-json';

// One page of Jira's enhanced search, as the fixture answers it: the fields and expansions the body asks for.
export const defaultLimit = 50;

type Paging = { start: number; limit: number; asked: Asked };

// The fields and expansions a search names in its body.
const askedOf = (body: Json | undefined): Asked => ({
  fields: list(at(body, 'fields')).map(text).filter(present),
  expand: text(at(body, 'expand')) ?? '',
});

export const pagingOf = (body: Json | undefined): Paging => ({
  start: Number(at(body, 'nextPageToken') ?? 0),
  limit: Number(at(body, 'maxResults') ?? defaultLimit),
  asked: askedOf(body),
});

type Found = { issues: FixtureIssue[]; projectKey: string };

// One page of issues, with a `nextPageToken` while more are left.
export function pageOf(
  { issues, projectKey }: Found,
  { start, limit, asked }: Paging,
): Json {
  const next = start + limit;
  const isLast = next >= issues.length;
  const shown = issues.slice(start, next);
  const answered = shown.map((issue) => issueJson(issue, projectKey, asked));
  const page = { issues: answered, isLast };

  return isLast ? page : { ...page, nextPageToken: String(next) };
}
