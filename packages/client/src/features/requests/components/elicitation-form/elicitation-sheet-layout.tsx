import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import { cn } from '@repo/kit/utils';
import { useEffect, useRef, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { ContentWidthProvider } from '#lib/product/content-layout';
import { useRequestKeyboard } from '../../hooks/use-request-keyboard';
import { RequestError } from '../request-card/request-card';
import { RequestFooter } from '../request-card/request-footer';
import { ElicitationActions } from './elicitation-actions';
import {
  cancel,
  ElicitationBody,
  type ElicitationView,
} from './elicitation-body';
import type { ElicitationFormProps } from './elicitation-form-props';
import { elicitationSheetLayout } from './elicitation-sheet-detents';

type ViewProps = { view: ElicitationView };

const sheetLayout = elicitationSheetLayout(Platform.OS);

const fillsSheet = sheetLayout.contentScrolls === true;

// The actions sit in the sheet's footer, in view at any height it rests at.
export function ElicitationSheetLayout({ view }: ViewProps): ReactElement {
  return (
    <Sheet
      open
      label={view.props.request.message}
      footer={<SheetFooter view={view} />}
      {...sheetLayout}
      {...useSheetDismissal(view.props)}
    >
      <SheetBody view={view} />
    </Sheet>
  );
}

function SheetBody({ view }: ViewProps): ReactElement {
  const nativeID = useSheetKeyboard(view);
  const answered = view.state.kind === 'answered';

  return (
    <View
      nativeID={nativeID}
      className={cn(fillsSheet && 'flex-1', answered && 'opacity-50')}
    >
      <ElicitationBody view={view} fill={fillsSheet} />
    </View>
  );
}

// The sheet only draws narrow, so its card keys as a narrow one does.
const useSheetKeyboard = (view: ElicitationView): string =>
  useRequestKeyboard({
    inactive: view.inactive,
    wide: false,
    onEnter: view.onEnter,
    onEscape: () => cancel(view),
  });

function SheetFooter({ view }: ViewProps): ReactElement {
  return (
    <ContentWidthProvider wide={false}>
      {view.validation}
      <RequestError error={view.error} />
      <RequestFooter
        surface="tray"
        state={view.state}
        actions={
          <ElicitationActions {...view.actions} inactive={view.inactive} />
        }
      />
    </ContentWidthProvider>
  );
}

type SheetDismissal = Pick<SheetProps, 'dismissible' | 'onOpenChange'>;

function useSheetDismissal(props: ElicitationFormProps): SheetDismissal {
  const dismissible = props.state.kind === 'open';
  const cancelOnce = useCancelOnce(props);

  return {
    dismissible,
    onOpenChange: (open): void => {
      if (!open && dismissible) cancelOnce();
    },
  };
}

// The sheet may report its close more than once; only the first cancels, until the request or its error changes.
function useCancelOnce(props: ElicitationFormProps): () => void {
  const dismissed = useRef(false);
  useEffect(() => {
    dismissed.current = false;
  }, [props.request.requestId, props.error]);

  return (): void => {
    if (dismissed.current) return;
    dismissed.current = true;
    props.onAnswer({ action: 'cancel' });
  };
}
