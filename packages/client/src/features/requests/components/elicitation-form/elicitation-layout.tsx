import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Surface } from '#primitives/layout/surface';
import {
  RequestCard,
  type RequestCardProps,
} from '../request-card/request-card';
import { ElicitationActions } from './elicitation-actions';
import {
  cancel,
  ElicitationBody,
  type ElicitationView,
} from './elicitation-body';
import { ElicitationSheetLayout } from './elicitation-sheet-layout';

export type { ElicitationView } from './elicitation-body';

// Where the card draws: in a Feed's request frame, in the wide Composer's tray, or in a phone's sheet.
export type ElicitationPlacement = 'card' | 'tray' | 'sheet';

type ViewProps = { view: ElicitationView };

type LayoutProps = ViewProps & { placement: ElicitationPlacement };

export function ElicitationLayout({
  view,
  placement,
}: LayoutProps): ReactElement {
  if (placement === 'sheet') return <ElicitationSheetLayout view={view} />;

  const card = <ElicitationCard view={view} />;

  return placement === 'tray' ? (
    <ElicitationTray>{card}</ElicitationTray>
  ) : (
    card
  );
}

function ElicitationCard({ view }: ViewProps): ReactElement {
  return (
    <RequestCard
      appearance="embedded"
      {...cardRequest(view)}
      footerClassName={useFooterClassName()}
      actions={
        <ElicitationActions {...view.actions} inactive={view.inactive} />
      }
    >
      <ElicitationBody view={view} />
      {view.validation}
    </RequestCard>
  );
}

type CardRequest = Pick<
  RequestCardProps,
  'state' | 'error' | 'onEnter' | 'onEscape'
>;

const cardRequest = (view: ElicitationView): CardRequest => ({
  state: view.state,
  error: view.error,
  onEnter: view.onEnter,
  onEscape: () => cancel(view),
});

function useFooterClassName(): string {
  return cn(
    'min-h-0 px-4 pt-4 pb-0 gap-2 flex-col items-stretch',
    useContentWide() && 'px-3 pt-3 pb-3.5 flex-row justify-end gap-1',
  );
}

function ElicitationTray({ children }: { children: ReactNode }): ReactElement {
  return (
    <View
      role="region"
      aria-label="Elicitation questions"
      className="self-stretch mx-1.75 -mb-3 pb-3"
    >
      <Surface kind="muted">{children}</Surface>
    </View>
  );
}
