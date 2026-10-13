import type * as React from 'react';
import { useState } from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PageHeader } from '#lib/product/page-header';
import { useWide } from '../../../lib/generic/use-wide/use-wide';
import { SessionHeaderActions } from './session-header-actions';
import { SessionHeaderTitle } from './session-header-meta';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionPullRequest } from './session-pull-request';

export type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from './session-header-props';

type ShownPullRequest = [
  SessionPullRequest | undefined,
  (number: number) => void,
];

// The PR the header shows: the first one until the "+n PR" menu picks another.
function useShownPullRequest(
  pullRequests: SessionPullRequest[],
): ShownPullRequest {
  const [picked, setPicked] = useState<number>();
  const shown =
    pullRequests.find((pullRequest) => pullRequest.number === picked) ??
    pullRequests.at(0);
  return [shown, setPicked];
}

const phoneHeaderItems = [
  // Changed files and the Session menu get their actions in later issues.
  <HeaderButton
    key="changes"
    icon="pull-request"
    paired
    accessibilityLabel="Changes"
  />,
  <HeaderButton key="more" icon="more" paired accessibilityLabel="More" />,
];

function PhoneSessionHeader({ title }: { title: string }): React.JSX.Element {
  return <ScreenHeader title={title} right={phoneHeaderItems} />;
}

interface WideSessionHeaderProps extends SessionHeaderProps {
  pullRequests: SessionPullRequest[];
  shownPullRequest: ShownPullRequest;
}

function WideSessionHeader({
  shownPullRequest: [shown, show],
  onMerge,
  ...props
}: WideSessionHeaderProps): React.JSX.Element {
  return (
    <PageHeader
      title={<SessionHeaderTitle {...props} shown={shown} onShow={show} />}
      actions={<SessionHeaderActions shown={shown} onMerge={onMerge} />}
    />
  );
}

// A phone gets the native stack's own header: the plain title, its back button, and two right items. Wide draws its PageHeader with a one-line title, the meta line (status, one PR, its checks) and the actions.
export function SessionHeader(props: SessionHeaderProps): React.JSX.Element {
  const wide = useWide();
  const pullRequests = props.pullRequests ?? [];
  const shownPullRequest = useShownPullRequest(pullRequests);
  if (!wide) return <PhoneSessionHeader title={props.title} />;
  return (
    <WideSessionHeader
      {...props}
      pullRequests={pullRequests}
      shownPullRequest={shownPullRequest}
    />
  );
}
