import type * as React from 'react';
import { useState } from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PageHeader } from '#lib/product/page-header';
import { useWide } from '../../../lib/generic/use-wide/use-wide';
import { defaultMergeMethod, type MergeMethod } from '../state/merge-method';
import {
  SessionHeaderActions,
  type SessionHeaderActionsProps,
} from './session-header-actions';
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

type MergeMethodChoice = Pick<
  SessionHeaderActionsProps,
  'method' | 'onMethodChange'
>;

// The merge method Merge PR runs: the one picked here, else the device's last, else squash.
function useMergeMethodChoice(
  props: Pick<SessionHeaderProps, 'mergeMethod' | 'onMergeMethodChange'>,
): MergeMethodChoice {
  const [picked, setPicked] = useState<MergeMethod>();

  const onMethodChange = (method: MergeMethod): void => {
    setPicked(method);
    props.onMergeMethodChange?.(method);
  };

  return {
    method: picked ?? props.mergeMethod ?? defaultMergeMethod,
    onMethodChange,
  };
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
  mergeChoice: MergeMethodChoice;
}

function WideSessionHeader({
  shownPullRequest: [shown, show],
  onMerge,
  mergeChoice,
  ...props
}: WideSessionHeaderProps): React.JSX.Element {
  return (
    <PageHeader
      title={<SessionHeaderTitle {...props} shown={shown} onShow={show} />}
      actions={<SessionHeaderActions {...{ ...mergeChoice, shown, onMerge }} />}
    />
  );
}

// A phone gets the native stack's own header: the plain title, its back button, and two right items. Wide draws its PageHeader with a one-line title, the meta line (status, one PR, its checks) and the actions.
export function SessionHeader(props: SessionHeaderProps): React.JSX.Element {
  const wide = useWide();
  const pullRequests = props.pullRequests ?? [];
  const shownPullRequest = useShownPullRequest(pullRequests);
  const mergeChoice = useMergeMethodChoice(props);

  if (!wide) return <PhoneSessionHeader title={props.title} />;

  return (
    <WideSessionHeader
      {...props}
      pullRequests={pullRequests}
      shownPullRequest={shownPullRequest}
      mergeChoice={mergeChoice}
    />
  );
}
