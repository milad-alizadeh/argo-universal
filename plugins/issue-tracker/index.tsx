import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { IssueDetail, IssueList } from './issue-list';
import type { IssuePage } from './issue-types';
import { ProjectDetails, type ProjectDetailsProps } from './project-details';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';
import { useIssuePage } from './use-issues';

type SlotProps = Pick<ProjectDetailsProps, 'context'>;

function IssuePageView({ selected, ...page }: IssuePage): JSX.Element {
  if (selected?.type === 'issue')
    return <IssueDetail {...page} issue={selected.issue} />;

  return <IssueList {...page} />;
}

export function register(argo: Argo): void {
  const trackers = createTrackerRegistry(argo);
  const storage = createTrackerStorage(argo, trackers.has);

  function IssuesPage(): JSX.Element {
    const page = useIssuePage(argo, storage, trackers);

    return <IssuePageView {...page} />;
  }

  function ProjectDetailsSlot(props: SlotProps): JSX.Element {
    return (
      <ProjectDetails {...props} storage={storage} trackers={trackers.list()} />
    );
  }

  argo.pages.register('/', IssuesPage);
  argo.slots.register('argo/project/details/v1', ProjectDetailsSlot);
}
