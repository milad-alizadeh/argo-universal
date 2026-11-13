import type {
  ChangeActions,
  SessionHeaderProps,
  SessionPullRequest,
} from '#features/sessions';
import type { ChangeFilesSource } from '../../plugins/change-files';
import type { SessionDetailViewProps } from './session-detail-view';

// The header the Workbench and Inspector read their Changes from, with the Plugins' Changes in it.
export const headerWithPullRequests = (
  header: SessionHeaderProps,
  pullRequests: SessionPullRequest[],
): SessionHeaderProps =>
  pullRequests.length === 0 ? header : { ...header, pullRequests };

// With none attached the Inspector still needs the actions: they are how the first one is found or attached.
const unchanged = (
  header: SessionHeaderProps,
  before: SessionHeaderProps,
  changeActions: ChangeActions | undefined,
): boolean => header === before && !changeActions;

// An open Session with the Changes the Plugins supplied; a Session that is not open has nowhere to show them.
export function withSessionPullRequests(
  props: SessionDetailViewProps,
  pullRequests: SessionPullRequest[],
  changeActions?: ChangeActions,
  changeFiles?: ChangeFilesSource,
): SessionDetailViewProps {
  if (props.state !== 'open') return props;

  const header = headerWithPullRequests(props.header, pullRequests);

  return unchanged(header, props.header, changeActions)
    ? props
    : { ...props, header, changeActions, changeFiles };
}
