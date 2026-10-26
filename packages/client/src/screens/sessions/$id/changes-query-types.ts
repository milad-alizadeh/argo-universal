import type { UseQueryResult } from '@tanstack/react-query';
import type { ClientError } from '#features/connection';

// What every Changes query is keyed by: the Session, whether the Changes are open, and what they compare against.
export type ChangesScope<Comparison> = {
  sessionId: string;
  open: boolean;
  comparison: Comparison;
};

export type QueryFailure = Pick<ClientError, 'message'>;

export type Query<T> = UseQueryResult<T, QueryFailure>;
