import type * as React from 'react';
import { useState } from 'react';
import { PageHeader } from '#lib/product/page-header';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import { defaultMergeMethod, type MergeMethod } from '../stores/merge-method';
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

// A phone gets the native stack's own header, which the Session's screen names: the plain title and its back button; the Session's actions come back as they are wired. Wide draws its PageHeader with a one-line title, the meta line (status, one PR, its checks) and the actions.
export function SessionHeader(props: SessionHeaderProps): React.JSX.Element {
  const state = useWideHeaderState(props);

  return (
    <SizeClass only="wide">
      <WideSessionHeader {...props} {...state} />
    </SizeClass>
  );
}

type WideHeaderState = Pick<
  WideSessionHeaderProps,
  'pullRequests' | 'shownPullRequest' | 'mergeChoice'
>;

// What the wide header keeps between renders: the PR it shows and the merge method Merge PR runs.
function useWideHeaderState(props: SessionHeaderProps): WideHeaderState {
  const pullRequests = props.pullRequests ?? [];

  return {
    pullRequests,
    shownPullRequest: useShownPullRequest(pullRequests),
    mergeChoice: useMergeMethodChoice(props),
  };
}
