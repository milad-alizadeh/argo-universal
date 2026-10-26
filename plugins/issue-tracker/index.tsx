import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { IssuePageView } from './issue-list';
import { ProjectDetails, type ProjectDetailsProps } from './project-details';
import { createTrackerRegistry } from './tracker-registry';
import { createTrackerStorage } from './tracker-storage';
import { useIssuePage } from './use-issues';

type SlotProps = Pick<ProjectDetailsProps, 'context'>;

export function register(api: Argo): void {
  const trackers = createTrackerRegistry(api);
  const storage = createTrackerStorage(api, trackers.has);

  function IssuesPage(): JSX.Element {
    const { selected, ...props } = useIssuePage(api, storage, trackers);

    return <IssuePageView {...props} selected={selected?.issue} />;
  }

  function ProjectDetailsSlot(props: SlotProps): JSX.Element {
    return (
      <ProjectDetails {...props} storage={storage} trackers={trackers.list()} />
    );
  }

  api.pages.register('/', IssuesPage);
  api.slots.register('argo/project/details/v1', ProjectDetailsSlot);
}
