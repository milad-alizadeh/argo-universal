import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import { cn } from '@repo/kit/utils';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { useRequestKeyboard } from '../../hooks/use-request-keyboard';
import { RequestFooter } from './request-footer';
import { SheetWhenCompact } from './request-sheet';

export { RequestAction } from './request-action';

export type RequestState =
  | { kind: 'open' }
  | { kind: 'submitting' }
  | { kind: 'answered'; reason: string };

export interface RequestCardProps extends Pick<
  ViewProps,
  'className' | 'testID'
> {
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
  sheetLabel?: string;
  surface?: 'card' | 'tray';
}

export function RequestCard(props: RequestCardProps): ReactNode {
  const nativeID = useCardKeyboard(props);
  const container = <RequestContainer {...props} nativeID={nativeID} />;

  if (!presentsSheet(props)) return container;

  return (
    <SheetWhenCompact {...props} container={container}>
      <RequestBody {...props} />
      <RequestError error={props.error} />
    </SheetWhenCompact>
  );
}

function useCardKeyboard(props: RequestCardProps): string {
  return useRequestKeyboard({
    inactive: props.state.kind !== 'open',
    wide: useContentWide(),
    onEnter: props.onEnter,
    onEscape: props.onEscape,
  });
}

function presentsSheet(props: RequestCardProps): boolean {
  return !!props.sheetLabel && props.appearance !== 'embedded';
}

function RequestContainer(
  props: RequestCardProps & Pick<ViewProps, 'nativeID'>,
): ReactNode {
  return (
    <View
      nativeID={props.nativeID}
      testID={props.testID}
      className={cn(containerClassName(props), props.className)}
    >
      <RequestSurface {...props} />
    </View>
  );
}

function containerClassName({
  surface,
}: Pick<RequestCardProps, 'surface' | 'appearance'>): string {
  if (surface === 'tray') return 'w-full gap-3 px-3 pt-3 pb-3.5';

  return 'w-full max-w-column';
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

function RequestSurface(props: RequestCardProps): ReactNode {
  if (props.appearance === 'embedded' || props.surface === 'tray')
    return <RequestContents {...props} />;

  return (
    <Surface kind="card">
      <RequestContents {...props} />
    </Surface>
  );
}

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

export function RequestError({
  error,
}: Pick<RequestCardProps, 'error'>): ReactNode {
  return (
    error && (
      <Text
        accessibilityRole="alert"
        role="secondary"
        className="px-4 pt-3 text-danger"
      >
        {error}
      </Text>
    )
  );
}
