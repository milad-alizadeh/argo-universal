import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { useProjects } from '#features/settings';
import {
  type OpenLinkOutcome,
  openLinkOutcome,
  openRoutePath,
} from './open-link-outcome';

// What the `/open` route does with its link, once the Server has said which one it is and listed its Projects.
export function useOpenLink(
  segments: readonly string[],
  stray: boolean,
): OpenLinkOutcome {
  const server = useQuery(useTRPC().navigation.server.queryOptions());

  return openLinkOutcome({
    link: openRoutePath(segments),
    stray,
    serverId: server.data?.serverId,
    projects: useProjects().data,
  });
}
