import { Button } from '#primitives/actions/button';
import { Callout } from '#primitives/status/callout';
import { EmptyState } from '#primitives/status/empty-state';
import type { DetailProps } from './detail-props';
import { agent, issue } from './detail.mocks';

export const contentAndMetadataDetail = {
  ...issue.detail,
} satisfies DetailProps;

export const agentDetail = { ...agent.detail } satisfies DetailProps;

export const loadingDetail = {
  ...issue.detail,
  isLoading: true,
} satisfies DetailProps;

export const emptyDetail = {
  children: <EmptyState title="No description" icon="issue" />,
} satisfies DetailProps;

// A read that failed: the reason in place of the description, with the one way to try again.
export const errorDetail = {
  children: (
    <Callout
      inline
      tone="danger"
      title="Couldn’t load this Issue"
      description="GitHub did not answer. Check the connection and try again."
      actions={<Button label="Try again" onPress={() => {}} />}
    />
  ),
} satisfies DetailProps;
