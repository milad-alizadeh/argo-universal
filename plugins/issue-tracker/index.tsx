import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { IssueDetail, IssueList } from './issue-list';
import { ProjectDetails, type ProjectDetailsProps } from './project-details';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';
import { useIssuePage, type IssuePage } from './use-issues';

type SlotProps = Pick<ProjectDetailsProps, 'context'>;

function IssuePageView({ selected, ...page }: IssuePage): JSX.Element {
  if (selected?.type === 'issue')
    return <IssueDetail {...page} issue={selected.issue} />;

  return <IssueList {...page} />;
}

export function register(api: Argo): void {
  const trackers = createTrackerRegistry(api);
  const storage = createTrackerStorage(api, trackers.has);

  function IssuesPage(): JSX.Element {
    const page = useIssuePage(api, storage, trackers);

    return <IssuePageView {...page} />;
  }

  function ProjectDetailsSlot(props: SlotProps): JSX.Element {
    return (
      <ProjectDetails {...props} storage={storage} trackers={trackers.list()} />
    );
  }

  api.pages.register('/', IssuesPage);
  api.slots.register('argo/project/details/v1', ProjectDetailsSlot);
}
