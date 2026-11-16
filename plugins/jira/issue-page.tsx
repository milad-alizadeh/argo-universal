import { ListDetail, type Argo, type LoaderInput } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueScreen, type IssueView } from './issue-detail';
import type { IssueTo } from './issue-shown';
import { loadIssueView } from './issue-view';
import { issuePattern, pathText } from './jira-paths';
import type { JiraReads } from './jira-reads';
import { projectRows, type ArgoProject } from './project-rows';

// How long Jira's answers are fresh while the page is open, as the list's are.
const freshForMs = 60_000;

type Params = Pick<LoaderInput, 'params'>;

const projectIdOf = ({ params }: Params): string =>
  pathText(params.project ?? '');

const keyOf = ({ params }: Params): string => pathText(params.key ?? '');

type IssueData = { projects: ArgoProject[]; view: IssueView };

async function loadIssue(
  argo: Argo,
  reads: JiraReads,
  input: LoaderInput,
): Promise<IssueData> {
  const projectId = projectIdOf(input);
  const step = { read: input.read, reads, projectId, key: keyOf(input) };

  const [projects, view] = await Promise.all([
    argo.projects.list(),
    loadIssueView(step),
  ]);

  return { projects, view };
}

type Drawn = IssueData & { to: IssueTo; input: Params };

const issueBeside = ({ projects, view, to, input }: Drawn): JSX.Element => {
  const projectId = projectIdOf(input);
  const framing = { key: keyOf(input), projectId, to };

  return (
    <ListDetail
      title="Jira"
      list={projectRows(projects, projectId)}
      detail={issueScreen(view, framing)}
    />
  );
};

// One Jira issue's page, beside its Project's views: a path names the Project and the issue, so one pattern serves all.
export const defineIssuePage = (argo: Argo, reads: JiraReads): void =>
  argo.pages.define(issuePattern, {
    every: freshForMs,
    load: (input) => loadIssue(argo, reads, input),
    render: (data, to, input) => issueBeside({ ...data, to, input }),
  });
