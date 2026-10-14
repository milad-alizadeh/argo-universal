import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';
import type { RequestState } from './request-card';

type AnsweredStatusProps = { reason: string; muted?: boolean };

export function RequestStatus({
  state,
  mutedStatus,
}: {
  state: RequestState;
  mutedStatus?: boolean;
}): ReactNode {
  if (state.kind !== 'answered') return null;

  return <AlreadyAnswered reason={state.reason} muted={mutedStatus} />;
}

function AlreadyAnswered(props: AnsweredStatusProps): ReactNode {
  return (
    <View
      role="status"
      className="min-w-0 flex-1 flex-row items-center gap-1.5 px-2"
    >
      <Icon
        name="info"
        role="body"
        className="shrink-0 text-muted-foreground"
      />
      <AnsweredText {...props} />
    </View>
  );
}

function AnsweredText({ reason, muted }: AnsweredStatusProps): ReactNode {
  return (
    <Text
      role="body"
      className={cn('min-w-0 flex-1', muted && 'text-muted-foreground')}
    >
      {reason}
    </Text>
  );
}
