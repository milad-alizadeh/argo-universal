import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#kit/scroll-column';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import {
  ActionListHeaderContext,
  ActionShortcutScope,
  type HeaderSink,
} from '#primitives/actions/action-list';
import { SvgBudget } from '#primitives/visual';
import { PageHeaderSinkProvider } from './page-header-actions';
import { ScreenAccessory } from './screen-accessory';
import { useScreenColumn } from './screen-column';
import { ScreenHeading } from './screen-heading';
import { ScreenNavigation } from './screen-navigation';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenProps } from './screen-props';
import { usePageActions } from './use-page-actions';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  return (
    <SvgBudget>
      <ActionShortcutScope>
        <ScreenSurface {...props} />
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The page's own Actions register first, so they lead those its content hands up.
function ScreenSurface(props: ScreenProps): ReactElement {
  const header = usePageActions();

  // Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <OwnActions register={header.register} actions={props.actions} />
      <ScreenNavigation {...props} header={header} />
      <ScreenHeading {...props} header={header} />
      <ScreenBody {...props} register={header.register} />
      <ScreenAccessory {...props} />
    </View>
  );
}

// Mounted for their registration only: the lists leave just their shortcut anchors, out of the Screen's layout.
function OwnActions(
  props: Pick<ScreenProps, 'actions'> & { register: HeaderSink },
): ReactElement {
  return (
    <ActionListHeaderContext value={props.register}>
      <View className="absolute">{props.actions}</View>
    </ActionListHeaderContext>
  );
}

function ScreenBody(
  props: ScreenProps & { register: HeaderSink },
): ReactElement {
  const { column, className } = useScreenBody(props);

  return (
    <View className={className}>
      <PageHeaderSinkProvider value={props.register}>
        <ScrollColumnContext value={column}>
          {props.children}
        </ScrollColumnContext>
      </PageHeaderSinkProvider>
    </View>
  );
}

function useScreenBody(props: ScreenProps): ScreenBodyStyle {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);
  const column = useScreenColumn();

  return {
    column: wide ? column : inherited,
    className: bodyClass(props, wide),
  };
}

interface ScreenBodyStyle {
  column: React.ContextType<typeof ScrollColumnContext>;
  className: string;
}

function bodyClass(props: ScreenProps, wide: boolean): string {
  return cn(
    'min-h-0 flex-1',
    !wide && hasFab(props) && 'android:pb-safe-offset-22',
  );
}

// Android's FAB, which the body's end clears; an unavailable primary Action shows none.
function hasFab(props: ScreenProps): boolean {
  const action = screenPrimaryAction(props);

  return Boolean(action && !action.disabled);
}
