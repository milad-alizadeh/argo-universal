import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type { ReactElement } from 'react';
import { ChangeStage } from './change-stage/change-stage';
import { MergePrButton } from './merge-pr-button';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionPullRequest } from './session-pull-request';

type ChangeProps = SessionHeaderProps & { change: SessionPullRequest };

const runMerge = ({
  onMerge,
  change,
}: ChangeProps):
  | ((method: NonNullable<SessionHeaderProps['mergeMethod']>) => void)
  | undefined => onMerge && ((method) => onMerge(change.number, method));

function ChangeMerge(props: ChangeProps): ReactElement | null {
  if (props.change.stage !== 'open') return null;

  return (
    <MergePrButton
      mergeable={props.change.mergeable}
      method={mergeMethod(props)}
      onMethodChange={mergeMethodChange(props)}
      onMerge={runMerge(props)}
    />
  );
}

const keepMethod = (): void => {};

const mergeMethod = (
  props: SessionHeaderProps,
): NonNullable<SessionHeaderProps['mergeMethod']> =>
  props.mergeMethod ?? 'squash';

const mergeMethodChange = (
  props: SessionHeaderProps,
): NonNullable<SessionHeaderProps['onMergeMethodChange']> =>
  props.onMergeMethodChange ?? keepMethod;

function ChangeDetail(props: ChangeProps): ReactElement {
  const { change } = props;

  return (
    <Stack direction="column" gap={3}>
      <ChangeStage {...change} />
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        {change.title}
      </Text>
      {change.checks && <PullRequestChecks {...change.checks} />}
      <ChangeMerge {...props} />
    </Stack>
  );
}

// Paper / Change detail: stage, checks and the closing action stay together in this page.
export function SessionChangeDetail(props: SessionHeaderProps): ReactElement {
  return (
    <Stack direction="column" gap={4}>
      {props.pullRequests?.map((change) => (
        <ChangeDetail key={change.number} {...props} change={change} />
      ))}
    </Stack>
  );
}
