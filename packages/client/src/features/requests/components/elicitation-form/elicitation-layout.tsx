import { cn } from '@repo/kit/utils';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
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

// Where the card draws: in a Feed's request frame, in the wide Composer's request tray, or in a phone's sheet.
export type ElicitationPlacement = 'card' | 'tray' | 'sheet';

type ViewProps = { view: ElicitationView };

type LayoutProps = ViewProps & { placement: ElicitationPlacement };

export function ElicitationLayout({
  view,
  placement,
}: LayoutProps): ReactElement {
  if (placement === 'sheet') return <ElicitationSheetLayout view={view} />;

  const card = <ElicitationCard view={view} scroll={placement === 'tray'} />;

  return placement === 'tray' ? (
    <ElicitationTray>{card}</ElicitationTray>
  ) : (
    card
  );
}

type CardProps = ViewProps & { scroll: boolean };

function ElicitationCard({ view, scroll }: CardProps): ReactElement {
  return (
    <RequestCard
      appearance="embedded"
      {...cardRequest(view)}
      footerClassName={useFooterClassName()}
      actions={cardActions(view)}
    >
      <ElicitationBody view={view} scroll={scroll} />
      {view.validation}
    </RequestCard>
  );
}

const cardActions = (view: ElicitationView): ReactElement => (
  <ElicitationActions {...view.actions} inactive={view.inactive} />
);

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

// The Composer's request tray draws the surface around it.
function ElicitationTray({ children }: { children: ReactNode }): ReactElement {
  return (
    <View role="region" aria-label="Elicitation questions">
      {children}
    </View>
  );
}
