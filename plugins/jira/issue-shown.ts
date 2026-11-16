import type { PageTo } from '@argo/plugin-kit';
import type { EditChoices } from './issue-reads';
import type { JiraIssue } from './jira-readers';
import type { JiraSite } from './jira-store';

// What one issue's page draws from: the issue, the choices its menus offer, and where its presses go.
export type IssueTo = PageTo<Record<never, never>>;

export type Shown = {
  site: JiraSite;
  issue: JiraIssue;
  choices: EditChoices;
  projectId: string;
  to: IssueTo;
};

// The props an edit's nodes show until its Operation answers.
export type Patches = NonNullable<ReturnType<IssueTo['run']>['optimistic']>;

// An Operation call's options: the props its nodes show until it answers.
export type Showing = { optimistic: Patches };

// A menu of choices marks the one in use; choosing another moves the check with the property.
export const checks = (keys: string[], chosen: string): Patches =>
  keys.map((key) => ({ key, props: { selected: key === chosen } }));

export const unassigned = 'Unassigned';
