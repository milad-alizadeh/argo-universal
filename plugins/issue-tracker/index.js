import { IssueDetail, IssueList } from './issue-list.js';
import { ProjectDetails } from './project-details.js';
import { registerTrackers } from './tracker-registry.js';
import { configureTrackerStorage } from './tracker-storage.js';
import { useIssuePage } from './use-issues.js';

function IssuesPage() {
  return <IssuePage />;
}

function IssuePage() {
  const page = useIssuePage(argo);

  return <IssuePageView {...page} />;
}

function IssuePageView({ selected, ...page }) {
  if (selected?.type === 'issue')
    return <IssueDetail {...page} issue={selected.issue} />;

  return <IssueList {...page} />;
}

let argo;

export function register(api) {
  argo = api;
  registerTrackers(api);
  configureTrackerStorage(api);
  api.pages.register('/', IssuesPage);
  api.slots.register('argo/project/details/v1', ProjectDetails);
}
