import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type { ReactElement } from 'react';
import { ChangeStage } from './change-stage/change-stage';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionPullRequest } from './session-pull-request';

type ChangeProps = SessionHeaderProps & { change: SessionPullRequest };

function ChangeDetail(props: ChangeProps): ReactElement {
  const { change } = props;

  return (
    <Stack direction="column" gap={3}>
      <ChangeStage {...change} />
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        {change.title}
      </Text>
      {change.checks && <PullRequestChecks {...change.checks} />}
    </Stack>
  );
}

// Paper / Change detail: each PR's stage, title and checks.
export function SessionChangeDetail(props: SessionHeaderProps): ReactElement {
  return (
    <Stack direction="column" gap={4}>
      {props.pullRequests?.map((change) => (
        <ChangeDetail key={change.number} {...props} change={change} />
      ))}
    </Stack>
  );
}
