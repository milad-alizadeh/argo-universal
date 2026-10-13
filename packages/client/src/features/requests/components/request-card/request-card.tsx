import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { useRequestKeyboard } from '../../hooks/use-request-keyboard';
import { RequestStatus } from './request-status';
export { RequestAction } from './request-action';

export type RequestState =
  | { kind: 'open' }
  | { kind: 'submitting' }
  | { kind: 'answered'; reason: string };

interface RequestCardProps extends Pick<ViewProps, 'className' | 'testID'> {
  appearance?: 'card' | 'embedded';
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
      className={cn(
        'w-full max-w-composer',
        props.appearance !== 'embedded' && cardClassName,
        props.className,
      )}
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
  'rounded-2xl bg-glass-card native:bg-background shadow-glass-card web:backdrop-blur-glass web:backdrop-saturate-180';

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
      <Text
        semanticRole="alert"
        role="secondary"
        className="px-4 pt-3 text-destructive"
      >
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
