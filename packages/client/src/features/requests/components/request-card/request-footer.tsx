import { cn } from '@repo/kit/utils';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import type { RequestCardProps, RequestState } from './request-card';
import { RequestStatus } from './request-status';

type FooterProps = Pick<
  RequestCardProps,
  'state' | 'mutedStatus' | 'actions' | 'footerClassName' | 'surface'
>;

export function RequestFooter(props: FooterProps): ReactNode {
  return (
    <View
      className={cn(
        'min-h-13 flex-row items-center gap-1 px-2 pt-3 pb-2',
        props.surface === 'tray' &&
          'flex-col gap-2 px-4 pb-4 wide:min-h-8 wide:flex-row wide:gap-1 wide:p-0',
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
