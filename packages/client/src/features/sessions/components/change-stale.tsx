import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { staleMessage } from './change-discovery';
import type { SessionPullRequest } from './session-pull-request';

type Stale = NonNullable<SessionPullRequest['stale']>;

const shortOf = (stale: Stale): string =>
  stale === 'signIn' ? 'Sign in to refresh' : 'Out of date';

const textOf = (stale: Stale, short: boolean | undefined): string =>
  short ? shortOf(stale) : staleMessage(stale);

// Provisional: says the Change shows what was last known, and why it could not be read again. Nothing for a fresh Change.
export function ChangeStale({
  stale,
  short,
}: Pick<SessionPullRequest, 'stale'> & {
  short?: boolean;
}): ReactElement | null {
  if (!stale) return null;

  const label = staleMessage(stale);

  return (
    <Text role="secondary" tone="warning" accessibilityLabel={label}>
      {textOf(stale, short)}
    </Text>
  );
}

// The detail's notice that its Change is what was last known, with the Refresh that reads it again.
export function StaleBar({
  change,
  onRefresh,
}: {
  change: SessionPullRequest;
  onRefresh?: () => void;
}): ReactElement | null {
  if (!change.stale) return null;

  return (
    <View className="items-start gap-2">
      <ChangeStale stale={change.stale} />
      {onRefresh && <Button size="sm" label="Refresh" onPress={onRefresh} />}
    </View>
  );
}
