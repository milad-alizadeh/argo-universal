import { use, useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ScreenContentHeader, type ContentHeader } from '#kit/content-header';
import { HeadingInsetContext, useHeadingInsetScope } from '#kit/heading-inset';
import { ScrollColumnContext } from '#kit/scroll-column';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { ActionShortcutScope } from '#primitives/actions/action';
import { SvgBudget } from '#primitives/visual';
import { ScreenAccessory } from './screen-accessory';
import { useScreenColumn } from './screen-column';
import { ScreenHeading } from './screen-heading';
import { ScreenNavigation } from './screen-navigation';
import { screenPrimaryAction } from './screen-primary-action';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useScreenHeader } from './use-screen-header';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  return (
    <SvgBudget>
      <ActionShortcutScope>
        <HeadingInsetScope>
          <ScreenSurface {...props} />
        </HeadingInsetScope>
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The Screen's heading learns from its content whether that is grouped cards.
function HeadingInsetScope(props: { children: ReactNode }): ReactElement {
  return (
    <HeadingInsetContext value={useHeadingInsetScope()}>
      {props.children}
    </HeadingInsetContext>
  );
}

function ScreenSurface(props: ScreenProps): ReactElement {
  const [contentHeader, setContentHeader] = useState<ContentHeader | null>(
    null,
  );

  const drawing = selectionScreen(props, contentHeader);
  const header = useScreenHeader(drawing);
  const heading = { ...drawing, header, contentHeader };

  return (
    <ScreenContentHeader value={setContentHeader}>
      <ScreenDrawing {...heading} />
    </ScreenContentHeader>
  );
}

function ScreenDrawing(props: ScreenHeaderInput): ReactElement {
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <ShortcutAnchors header={props.header} />
      <ScreenNavigation {...props} />
      <ScreenHeading {...props} />
      <ScreenBody {...props} />
      <ScreenAccessory {...props} />
    </View>
  );
}

function ScreenBody(props: ScreenProps): ReactElement {
  const { column, className } = useScreenBody(props);

  return (
    <View className={className}>
      <ScrollColumnContext value={column}>{props.children}</ScrollColumnContext>
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

function selectionScreen(
  props: ScreenProps,
  header: ContentHeader | null,
): ScreenProps {
  return header?.replacement
    ? {
        ...props,
        actions: undefined,
        primaryAction: undefined,
        caption: undefined,
      }
    : props;
}
