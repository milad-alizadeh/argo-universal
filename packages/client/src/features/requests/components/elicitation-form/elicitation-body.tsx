import { cn } from '@repo/kit/utils';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import type { ElicitationActionsProps } from './elicitation-actions';
import type { ElicitationFormProps } from './elicitation-form-props';
import {
  ElicitationHeader,
  type ElicitationHeaderProps,
} from './elicitation-question-header';

// One page of a request, whichever kind it asks: its header, its rows and its actions.
export type ElicitationView = {
  props: ElicitationFormProps;
  state: ElicitationFormProps['state'];
  error?: string;
  header: Omit<ElicitationHeaderProps, 'inactive' | 'onDismiss'>;
  rows: ReactElement;
  // What stops the answer, such as a field to fix.
  validation?: ReactElement;
  actions: Omit<ElicitationActionsProps, 'inactive'>;
  inactive: boolean;
  onEnter: () => void;
};

type ViewProps = { view: ElicitationView };

export const cancel = (view: ElicitationView): void =>
  view.props.onAnswer({ action: 'cancel' });

// The header, then the rows, which inset themselves; only the header pads on a phone.
export function ElicitationBody({
  view,
  fill = false,
}: ViewProps & { fill?: boolean }): ReactElement {
  const wide = useContentWide();

  return (
    <View
      className={cn(bodyClassName(wide, fill), pointerEvents(view.inactive))}
    >
      <BodyHeader view={view} />
      {view.rows}
    </View>
  );
}

function bodyClassName(wide: boolean, fill: boolean): string {
  return cn('gap-3 pt-1 ios:pt-9', wide && 'px-3 pt-3', fill && 'flex-1');
}

const pointerEvents = (inactive: boolean): string =>
  inactive ? 'pointer-events-none' : 'pointer-events-auto';

function BodyHeader({ view }: ViewProps): ReactElement {
  const wide = useContentWide();

  return (
    <View className={cn(!wide && 'px-4')}>
      <ElicitationHeader
        {...view.header}
        inactive={view.inactive}
        onDismiss={() => cancel(view)}
      />
    </View>
  );
}
