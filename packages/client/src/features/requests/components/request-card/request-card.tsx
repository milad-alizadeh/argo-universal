import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  ContentWidthProvider,
  useContentWide,
} from '#lib/product/content-layout';
import { Text } from '#primitives/display/text/text';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { useRequestKeyboard } from '../../hooks/use-request-keyboard';
import { RequestFooter } from './request-footer';
export { RequestAction } from './request-action';

export type RequestState =
  | { kind: 'open' }
  | { kind: 'submitting' }
  | { kind: 'answered'; reason: string };

export interface RequestCardProps extends Pick<
  ViewProps,
  'className' | 'testID'
> {
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
  sheetLabel?: string;
  surface?: 'card' | 'tray';
}

export function RequestCard(props: RequestCardProps): ReactNode {
  const wide = useContentWide();
  const windowWide = useWide();
  const nativeID = useRequestKeyboard({
    inactive: props.state.kind !== 'open',
    wide,
    onEnter: props.onEnter,
    onEscape: props.onEscape,
  });
  if (props.sheetLabel && !windowWide) return <RequestSheet {...props} />;
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
        props.surface === 'tray'
          ? 'w-full gap-3 px-3 pt-3 pb-3.5'
          : cardClassName,
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
  'w-full max-w-composer rounded-surface bg-card shadow-card dark:border dark:border-border';

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

function RequestSheet(props: RequestCardProps): ReactNode {
  return (
    <BottomSheet
      open
      onOpenChange={() => {}}
      dismissible={false}
      expandable
      initialSize={props.surface === 'tray' ? 'medium' : undefined}
      label={props.sheetLabel}
      footer={
        <ContentWidthProvider wide={false}>
          <RequestFooter {...props} />
        </ContentWidthProvider>
      }
    >
      <ContentWidthProvider wide={false}>
        <RequestBody {...props} />
        <RequestError error={props.error} />
      </ContentWidthProvider>
    </BottomSheet>
  );
}
