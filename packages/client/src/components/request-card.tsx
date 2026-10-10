import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { useContentWide } from './content-layout';
import { useRequestKeyboard } from './use-request-keyboard';
export { RequestAction } from './request-action';

export type RequestState =
  | { kind: 'open' }
  | { kind: 'submitting' }
  | { kind: 'answered'; reason: string };

interface RequestCardProps extends Pick<ViewProps, 'className' | 'testID'> {
  state: RequestState;
  error?: string;
  onEnter: () => void;
  onEscape?: () => void;
  children: ReactNode;
  actions: ReactNode;
  heading?: ReactNode;
  bodyClassName?: string;
  footerClassName?: string;
  mutedStatus?: boolean;
}

export function RequestCard(props: RequestCardProps): ReactNode {
  const nativeID = useRequestKeyboard({
    inactive: props.state.kind !== 'open',
    wide: useContentWide(),
    onEnter: props.onEnter,
    onEscape: props.onEscape,
  });
  return <RequestContainer {...props} nativeID={nativeID} />;
}

function RequestContainer(
  props: RequestCardProps & Pick<ViewProps, 'nativeID'>,
): ReactNode {
  return (
    <View
      nativeID={props.nativeID}
      testID={props.testID}
      className={cn(cardClassName, props.className)}
    >
      <RequestContents {...props} />
    </View>
  );
}

function RequestContents(props: RequestCardProps): ReactNode {
  return (
    <>
      {props.heading}
      <RequestBody {...props} />
      <RequestError error={props.error} />
      <RequestFooter {...props} />
    </>
  );
}

const cardClassName =
  'w-full max-w-composer rounded-xl border border-input/80 bg-background/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110';

function RequestBody({
  state,
  children,
  bodyClassName,
}: Pick<RequestCardProps, 'state' | 'children' | 'bodyClassName'>): ReactNode {
  return (
    <View
      className={cn(state.kind === 'answered' && 'opacity-50', bodyClassName)}
    >
      {children}
    </View>
  );
}

function RequestError({ error }: Pick<RequestCardProps, 'error'>): ReactNode {
  return (
    error && (
      <Text role="alert" className="px-4 pt-3 type-secondary text-destructive">
        {error}
      </Text>
    )
  );
}

type FooterProps = Pick<
  RequestCardProps,
  'state' | 'mutedStatus' | 'actions' | 'footerClassName'
>;

function RequestFooter(props: FooterProps): ReactNode {
  return (
    <View
      className={cn(
        'min-h-13 flex-row items-center gap-1 px-2 pt-3 pb-2',
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
      <Icon name="info" size="md" className="shrink-0 text-muted-foreground" />
      <AnsweredText {...props} />
    </View>
  );
}

function AnsweredText({ reason, muted }: AnsweredStatusProps): ReactNode {
  return (
    <Text
      className={cn(
        'min-w-0 flex-1 type-body',
        muted && 'text-muted-foreground',
      )}
    >
      {reason}
    </Text>
  );
}
