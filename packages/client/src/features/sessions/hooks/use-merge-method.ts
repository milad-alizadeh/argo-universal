import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionHeaderProps } from '../components/session-header-props';
import { mergeMethodQuery, rememberMergeMethod } from '../state/merge-method';

export type MergeMethodChoice = Pick<
  SessionHeaderProps,
  'mergeMethod' | 'onMergeMethodChange'
>;

// This device's last merge method, and the pick that replaces it.
export function useMergeMethod(): MergeMethodChoice {
  const client = useQueryClient();
  const { data } = useQuery(mergeMethodQuery);

  return {
    mergeMethod: data,
    onMergeMethodChange: (method) => rememberMergeMethod(client, method),
  };
}
