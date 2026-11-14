import { fn } from 'storybook/test';
import { type SessionPullRequest } from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';

export {
  pullRequestMocks,
  severalPullRequests,
} from '../../../features/sessions/components/session-pull-request.mocks';

// The Session's PR props, presented by its Workbench and Inspector.
export function withPullRequests(
  session: OpenSessionViewProps,
  pullRequests: SessionPullRequest[],
): OpenSessionViewProps {
  return {
    ...session,
    header: {
      ...session.header,
      pullRequests,
      changes: session.header.changes ?? changesHeader(),
    },
  };
}

// The Checkout's own totals are its own: a pull request's totals are never added into them.
function changesHeader(): NonNullable<
  OpenSessionViewProps['header']['changes']
> {
  return { open: false, onOpenChange: fn() };
}
