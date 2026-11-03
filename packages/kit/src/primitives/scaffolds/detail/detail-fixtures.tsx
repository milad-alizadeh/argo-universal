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
