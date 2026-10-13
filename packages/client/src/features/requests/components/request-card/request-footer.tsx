import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import type { RequestCardProps, RequestState } from './request-card';

type FooterProps = Pick<
  RequestCardProps,
  'state' | 'mutedStatus' | 'actions' | 'footerClassName' | 'surface'
>;

export function RequestFooter(props: FooterProps): ReactNode {
  return (
    <View
      className={cn(
        'min-h-13 flex-col gap-2 px-2 pt-3 pb-2 wide:flex-row wide:items-center wide:gap-1',
        props.surface === 'tray' && 'px-4 pb-4 wide:min-h-8 wide:p-0',
        props.footerClassName,
      )}
    >
      <RequestFooterContents {...props} />
    </View>
  );
}

function RequestFooterContents(props: FooterProps): ReactNode {
  const wide = useContentWide();
  return (
    <>
      <RequestStatus state={props.state} mutedStatus={props.mutedStatus} />
      {showActions(props.state, wide) && props.actions}
    </>
  );
}

function showActions(state: RequestState, wide: boolean): boolean {
  return state.kind !== 'answered' || wide;
}

type AnsweredStatusProps = {
  reason: string;
  muted?: boolean;
};

function RequestStatus({
  state,
  mutedStatus,
}: Pick<RequestCardProps, 'state' | 'mutedStatus'>): ReactNode {
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
