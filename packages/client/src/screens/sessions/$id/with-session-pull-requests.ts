import type {
  ChangeActions,
  SessionHeaderProps,
  SessionPullRequest,
} from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';

// The header the Workbench and Inspector read their Changes from, with the Plugins' Changes in it.
export const headerWithPullRequests = (
  header: SessionHeaderProps,
  pullRequests: SessionPullRequest[],
): SessionHeaderProps =>
  pullRequests.length === 0 ? header : { ...header, pullRequests };

// An open Session with the Changes the Plugins supplied; a Session that is not open has nowhere to show them.
export function withSessionPullRequests(
  props: SessionDetailViewProps,
  pullRequests: SessionPullRequest[],
  changeActions?: ChangeActions,
): SessionDetailViewProps {
  if (props.state !== 'open') return props;

  const header = headerWithPullRequests(props.header, pullRequests);

  if (header === props.header) return props;

  return { ...props, header, changeActions };
}
